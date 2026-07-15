import { Inject, Injectable } from '@nestjs/common';
import { ClientSession } from 'mongoose';
import type { IWalletRepository } from './interfaces/wallet.repository.interface';
import { Wallet } from './entities/wallet.entity';
import { WalletNotFoundException } from './exceptions/wallet-not-found.exception';
import { InsufficientFundsException } from './exceptions/insufficient-funds.exception';
import { InvalidAmountException } from './exceptions/invalid-amount.exception';
import { TransactionService } from '../transaction/transaction.service';
import { TransactionType } from '../transaction/enums/transaction-type.enum';
import { TransactionStatus } from '../transaction/enums/transaction-status.enum';

@Injectable()
export class WalletService {
  constructor(
    @Inject('IWalletRepository')
    private readonly walletRepository: IWalletRepository,
    private readonly transactionService: TransactionService,
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
   * - If the operation succeeds → logs SUCCESS.
   * - If the operation fails (any exception) → logs FAILED then re-throws.
   */
  private async executeWalletOp(params: {
    userId: string;
    amount: number;
    type: TransactionType;
    operation: (walletId: string, amount: number) => Promise<Wallet | null>;
    onNull: () => never;
    referenceId?: string;
  }): Promise<Wallet> {
    this.validateAmount(params.amount);
    const wallet = await this.getWalletOrThrow(params.userId);
    const walletId = wallet._id.toString();

    let updated: Wallet | null = null;

    try {
      updated = await params.operation(walletId, params.amount);
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

    await this.transactionService.createTransaction({
      walletId,
      type: params.type,
      amount: params.amount,
      status: TransactionStatus.SUCCESS,
      referenceId: params.referenceId,
    });

    return updated;
  }

  // ─── Internal (called by AuthService) ───────────────────────────────────────

  /**
   * Creates a wallet for a newly registered user.
   * Accepts an optional session to participate in the caller's transaction.
   */
  async createWallet(userId: string, session?: ClientSession): Promise<Wallet> {
    return await this.walletRepository.create(userId, session);
  }

  // ─── User-Facing ─────────────────────────────────────────────────────────────

  async getMyWallet(userId: string): Promise<Wallet> {
    return await this.getWalletOrThrow(userId);
  }

  async deposit(userId: string, amount: number): Promise<Wallet> {
    return this.executeWalletOp({
      userId,
      amount,
      type: TransactionType.DEPOSIT,
      operation: (walletId, amt) =>
        this.walletRepository.creditBalance(walletId, amt),
      onNull: () => {
        throw new WalletNotFoundException();
      },
    });
  }

  async withdraw(userId: string, amount: number): Promise<Wallet> {
    return this.executeWalletOp({
      userId,
      amount,
      type: TransactionType.WITHDRAW,
      operation: (walletId, amt) =>
        this.walletRepository.debitBalance(walletId, amt),
      onNull: () => {
        throw new InsufficientFundsException();
      },
    });
  }

  // ─── Internal (called by AuctionService) ─────────────────────────────────────

  async hold(
    userId: string,
    amount: number,
    referenceId?: string,
  ): Promise<Wallet> {
    return this.executeWalletOp({
      userId,
      amount,
      type: TransactionType.HOLD,
      operation: (walletId, amt) =>
        this.walletRepository.holdBalance(walletId, amt),
      onNull: () => {
        throw new InsufficientFundsException();
      },
      referenceId,
    });
  }

  async release(
    userId: string,
    amount: number,
    referenceId?: string,
  ): Promise<Wallet> {
    return this.executeWalletOp({
      userId,
      amount,
      type: TransactionType.RELEASE,
      operation: (walletId, amt) =>
        this.walletRepository.releaseBalance(walletId, amt),
      onNull: () => {
        throw new InsufficientFundsException();
      },
      referenceId,
    });
  }

  async capture(
    userId: string,
    amount: number,
    referenceId?: string,
  ): Promise<Wallet> {
    return this.executeWalletOp({
      userId,
      amount,
      type: TransactionType.CAPTURE,
      operation: (walletId, amt) =>
        this.walletRepository.captureHeldBalance(walletId, amt),
      onNull: () => {
        throw new InsufficientFundsException();
      },
      referenceId,
    });
  }
}
