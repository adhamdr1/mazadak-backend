import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientSession, Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import type { IWalletRepository } from './interfaces/wallet.repository.interface';
import { Wallet } from './entities/wallet.entity';
import { WalletNotFoundException } from './exceptions/wallet-not-found.exception';
import { InsufficientFundsException } from './exceptions/insufficient-funds.exception';
import { InvalidAmountException } from './exceptions/invalid-amount.exception';
import { TransactionService } from '../transaction/transaction.service';
import { TransactionType } from '../transaction/enums/transaction-type.enum';
import { TransactionStatus } from '../transaction/enums/transaction-status.enum';
import { Transaction } from '../transaction/entities/transaction.entity';
import { WalletsPage } from './dto/wallets-page.type';
import { PaginationInput } from '../common/dto/pagination.input';
import { RabbitMQEvent } from '../infrastructure/rabbitmq/rabbitmq-event.types';
import { OutboxService } from '../infrastructure/outbox/outbox.service';
import Decimal from 'decimal.js';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @Inject('IWalletRepository')
    private readonly walletRepository: IWalletRepository,
    private readonly transactionService: TransactionService,
    private readonly outboxService: OutboxService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private validateAmount(amount: number): void {
    if (!amount || new Decimal(amount).lessThanOrEqualTo(0)) {
      throw new InvalidAmountException();
    }
  }

  private async getWalletOrThrow(userId: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findByUserId(userId);
    if (!wallet) throw new WalletNotFoundException();
    return wallet;
  }

  /**
   * Executes a wallet operation and logs its result as a Transaction.
   * - If the operation succeeds → logs SUCCESS and returns both wallet and created Transaction record.
   * - If the operation fails (any exception) → logs FAILED then re-throws.
   */
  private async executeWalletOp(params: {
    userId: string;
    amount: number;
    currency?: string;
    type: TransactionType;
    operation: (
      walletId: string,
      amount: number,
      session?: ClientSession,
    ) => Promise<Wallet | null>;
    onNull: () => never;
    referenceId?: string;
    session?: ClientSession;
  }): Promise<{ wallet: Wallet; transaction: Transaction }> {
    this.validateAmount(params.amount);
    const wallet = await this.getWalletOrThrow(params.userId);
    const walletId = wallet._id.toString();
    const currency = params.currency ?? 'EGP';

    const updated = await params.operation(
      walletId,
      params.amount,
      params.session,
    );
    if (!updated) params.onNull();

    const transaction = await this.transactionService.createTransaction(
      {
        walletId,
        type: params.type,
        amount: params.amount,
        currency,
        status: TransactionStatus.SUCCESS,
        referenceId: params.referenceId,
      },
      params.session,
    );

    return { wallet: updated, transaction };
  }

  // ─── Internal (called by AuthService) ───────────────────────────────────────

  /**
   * Creates a wallet for a newly registered user.
   * Accepts an optional session to participate in the caller's transaction.
   */
  async createWallet(userId: string, session?: ClientSession): Promise<Wallet> {
    return await this.walletRepository.create(userId, session);
  }

  // ─── Admin-Facing ─────────────────────────────────────────────────────────────

  async getAllWallets(input: PaginationInput): Promise<WalletsPage> {
    const { page, limit } = input;
    const [items, total] = await Promise.all([
      this.walletRepository.findAll(page, limit),
      this.walletRepository.countAll(),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      items,
      total,
      totalPages,
      hasNextPage: page < totalPages,
    };
  }

  async getWalletByUserId(userId: string): Promise<Wallet> {
    return await this.getWalletOrThrow(userId);
  }

  async sumAllBalances(): Promise<number> {
    return this.walletRepository.sumAllBalances();
  }

  // ─── User-Facing ─────────────────────────────────────────────────────────────

  async getMyWallet(userId: string): Promise<Wallet> {
    return await this.getWalletOrThrow(userId);
  }

  /**
   * Processes a deposit operation for the user's wallet.
   * There are two types of deposit flows:
   *
   * 1. Manual/Mock Deposit (referenceId is NOT provided):
   *    - Represents a client-initiated deposit from a payment provider (e.g. Credit Card/InstaPay).
   *    - Triggers the generic notifyDeposit email since it's a direct user deposit action.
   *    - In production, client mutations are disabled, and this flow is executed strictly via webhook/reconciliation.
   *
   * 2. Internal/System/P2P Deposit (referenceId IS provided, e.g., auctionId):
   *    - Represents a system-initiated balance transfer (e.g., settling an auction by moving held funds from the winning bidder to the seller).
   *    - Does NOT send the generic notifyDeposit email because context-specific notifications (like "Auction Won" / "Auction Ended") are handled separately.
   */
  async deposit(
    userId: string,
    amount: number,
    referenceId?: string,
    session?: ClientSession,
    currency?: string,
  ): Promise<{ wallet: Wallet; transaction: Transaction }> {
    const { wallet, transaction } = await this.executeWalletOp({
      userId,
      amount,
      currency,
      type: TransactionType.DEPOSIT,
      referenceId,
      session,
      operation: (walletId, amt, sess) =>
        this.walletRepository.creditBalance(walletId, amt, sess),
      onNull: () => {
        throw new WalletNotFoundException();
      },
    });

    // Only send the generic deposit email if this is a manual deposit (no referenceId).
    // If referenceId is present, it's a system action (like winning an auction),
    // and the user will already receive a context-specific email (e.g., Auction Won).
    if (!referenceId) {
      this.notifyDeposit(
        userId,
        amount,
        transaction._id.toString(),
        session,
      ).catch((err) => {
        this.logger.error(
          `Failed to queue deposit notification: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    }

    return { wallet, transaction };
  }

  async withdraw(
    userId: string,
    amount: number,
    referenceId?: string,
    session?: ClientSession,
  ): Promise<{ wallet: Wallet; transaction: Transaction }> {
    if (session) {
      return this.executeWithdrawal(userId, amount, referenceId, session);
    }

    const newSession = await this.connection.startSession();
    let walletId: string | undefined;
    try {
      newSession.startTransaction();
      // Resolve walletId before the operation so we can log failures.
      const wallet = await this.getWalletOrThrow(userId);
      walletId = wallet._id.toString();

      const result = await this.executeWithdrawal(
        userId,
        amount,
        referenceId,
        newSession,
      );
      await newSession.commitTransaction();
      return result;
    } catch (error) {
      await newSession.abortTransaction();

      // Log the failed transaction safely outside the aborted session.
      if (walletId) {
        try {
          await this.transactionService.createTransaction({
            walletId,
            type: TransactionType.WITHDRAW,
            amount,
            currency: 'EGP',
            status: TransactionStatus.FAILED,
            referenceId,
          });
        } catch (logErr) {
          this.logger.error(
            `Failed to log FAILED withdrawal transaction for user ${userId}: ${logErr instanceof Error ? logErr.message : String(logErr)}`,
          );
        }
      }

      throw error;
    } finally {
      await newSession.endSession();
    }
  }

  private async executeWithdrawal(
    userId: string,
    amount: number,
    referenceId?: string,
    session?: ClientSession,
  ): Promise<{ wallet: Wallet; transaction: Transaction }> {
    const { wallet, transaction } = await this.executeWalletOp({
      userId,
      amount,
      type: TransactionType.WITHDRAW,
      referenceId,
      session,
      operation: (walletId, amt, sess) =>
        this.walletRepository.debitBalance(walletId, amt, sess),
      onNull: () => {
        throw new InsufficientFundsException();
      },
    });

    // Only send the generic withdrawal email if this is a manual withdrawal.
    if (!referenceId) {
      // Pass created MongoDB Transaction _id to email!
      this.notifyWithdrawal(
        userId,
        amount,
        transaction._id.toString(),
        session,
      ).catch((err) => {
        this.logger.error(
          `Failed to queue withdrawal notification for user ${userId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    }

    return { wallet, transaction };
  }

  private async notifyDeposit(
    userId: string,
    amount: number,
    transactionId?: string,
    session?: ClientSession,
  ): Promise<void> {
    await this.outboxService.saveEvent(
      RabbitMQEvent.WalletDeposited,
      {
        userId,
        amount,
        transactionId: transactionId || 'N/A',
      },
      session,
      transactionId,
    );
  }

  private async notifyWithdrawal(
    userId: string,
    amount: number,
    transactionId?: string,
    session?: ClientSession,
  ): Promise<void> {
    await this.outboxService.saveEvent(
      RabbitMQEvent.WithdrawalCompleted,
      {
        userId,
        amount,
        transactionId: transactionId || 'N/A',
      },
      session,
      transactionId,
    );
  }

  // ─── Internal (called by AuctionService) ─────────────────────────────────────

  async hold(
    userId: string,
    amount: number,
    referenceId?: string,
    session?: ClientSession,
  ): Promise<{ wallet: Wallet; transaction: Transaction }> {
    return await this.executeWalletOp({
      userId,
      amount,
      type: TransactionType.HOLD,
      referenceId,
      session,
      operation: (walletId, amt, sess) =>
        this.walletRepository.holdBalance(walletId, amt, sess),
      onNull: () => {
        throw new InsufficientFundsException();
      },
    });
  }

  async release(
    userId: string,
    amount: number,
    referenceId?: string,
    session?: ClientSession,
  ): Promise<{ wallet: Wallet; transaction: Transaction }> {
    return await this.executeWalletOp({
      userId,
      amount,
      type: TransactionType.RELEASE,
      referenceId,
      session,
      operation: (walletId, amt, sess) =>
        this.walletRepository.releaseBalance(walletId, amt, sess),
      onNull: () => {
        throw new InsufficientFundsException();
      },
    });
  }

  async capture(
    userId: string,
    amount: number,
    referenceId?: string,
    session?: ClientSession,
  ): Promise<{ wallet: Wallet; transaction: Transaction }> {
    return await this.executeWalletOp({
      userId,
      amount,
      type: TransactionType.CAPTURE,
      referenceId,
      session,
      operation: (walletId, amt, sess) =>
        this.walletRepository.captureHeldBalance(walletId, amt, sess),
      onNull: () => {
        throw new InsufficientFundsException();
      },
    });
  }
}
