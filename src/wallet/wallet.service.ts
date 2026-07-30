import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientSession } from 'mongoose';
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
import { RabbitMQService } from '../infrastructure/rabbitmq/rabbitmq.service';
import { RabbitMQEvent } from '../infrastructure/rabbitmq/rabbitmq-event.types';
import { UsersService } from '../users/users.service';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @Inject('IWalletRepository')
    private readonly walletRepository: IWalletRepository,
    private readonly transactionService: TransactionService,
    private readonly rabbitMQService: RabbitMQService,
    private readonly usersService: UsersService,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private validateAmount(amount: number): void {
    if (amount <= 0) throw new InvalidAmountException();
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

    let updated: Wallet | null = null;

    try {
      updated = await params.operation(walletId, params.amount, params.session);
      if (!updated) params.onNull();
    } catch (error) {
      // Best-effort: log failed transaction without masking the original error
      void this.transactionService.createTransaction({
        walletId,
        type: params.type,
        amount: params.amount,
        status: TransactionStatus.FAILED,
        referenceId: params.referenceId,
      });
      throw error;
    }

    const transaction = await this.transactionService.createTransaction({
      walletId,
      type: params.type,
      amount: params.amount,
      status: TransactionStatus.SUCCESS,
      referenceId: params.referenceId,
    });

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

  async deposit(
    userId: string,
    amount: number,
    referenceId?: string,
    session?: ClientSession,
  ): Promise<{ wallet: Wallet; transaction: Transaction }> {
    const { wallet, transaction } = await this.executeWalletOp({
      userId,
      amount,
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
      this.notifyDeposit(userId, amount, transaction._id.toString()).catch(
        (err) => {
          this.logger.error(
            `Failed to send deposit email: ${err instanceof Error ? err.message : String(err)}`,
          );
        },
      );
    }

    return { wallet, transaction };
  }

  async withdraw(
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
      this.notifyWithdrawal(userId, amount, transaction._id.toString()).catch(
        (err) => {
          this.logger.error(
            `Failed to send withdrawal email for user ${userId}: ${err instanceof Error ? err.message : String(err)}`,
          );
        },
      );
    }

    return { wallet, transaction };
  }

  private async notifyDeposit(
    userId: string,
    amount: number,
    transactionId?: string,
  ): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) return;

    const name =
      [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';

    await this.rabbitMQService.publish(RabbitMQEvent.WalletDeposited, {
      userId,
      email: user.email,
      name,
      amount,
      transactionId: transactionId || 'N/A',
    });
  }

  private async notifyWithdrawal(
    userId: string,
    amount: number,
    transactionId?: string,
  ): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) return;

    const name =
      [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';

    await this.rabbitMQService.publish(RabbitMQEvent.WithdrawalCompleted, {
      userId,
      email: user.email,
      name,
      amount,
      transactionId: transactionId || 'N/A',
    });
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
