import { Inject, Injectable } from '@nestjs/common';
import { ClientSession } from 'mongoose';
import type { IWalletRepository } from './interfaces/wallet.repository.interface';
import { Wallet } from './entities/wallet.entity';
import { WalletNotFoundException } from './exceptions/wallet-not-found.exception';
import { InsufficientFundsException } from './exceptions/insufficient-funds.exception';
import { InvalidAmountException } from './exceptions/invalid-amount.exception';

@Injectable()
export class WalletService {
  constructor(
    @Inject('IWalletRepository')
    private readonly walletRepository: IWalletRepository,
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
    this.validateAmount(amount);
    const wallet = await this.getWalletOrThrow(userId);

    const updated = await this.walletRepository.creditBalance(
      wallet._id.toString(),
      amount,
    );
    if (!updated) throw new WalletNotFoundException();

    // TODO: createTransaction(DEPOSIT) — Phase 2
    return updated;
  }

  async withdraw(userId: string, amount: number): Promise<Wallet> {
    this.validateAmount(amount);
    const wallet = await this.getWalletOrThrow(userId);

    const updated = await this.walletRepository.debitBalance(
      wallet._id.toString(),
      amount,
    );
    if (!updated) throw new InsufficientFundsException();

    // TODO: createTransaction(WITHDRAW) — Phase 2
    return updated;
  }

  async hold(userId: string, amount: number): Promise<Wallet> {
    this.validateAmount(amount);
    const wallet = await this.getWalletOrThrow(userId);

    const updated = await this.walletRepository.holdBalance(
      wallet._id.toString(),
      amount,
    );
    if (!updated) throw new InsufficientFundsException();

    // TODO: createTransaction(HOLD) — Phase 2
    return updated;
  }

  async release(userId: string, amount: number): Promise<Wallet> {
    this.validateAmount(amount);
    const wallet = await this.getWalletOrThrow(userId);

    const updated = await this.walletRepository.releaseBalance(
      wallet._id.toString(),
      amount,
    );
    if (!updated) throw new InsufficientFundsException();

    // TODO: createTransaction(RELEASE) — Phase 2
    return updated;
  }

  async capture(userId: string, amount: number): Promise<Wallet> {
    this.validateAmount(amount);
    const wallet = await this.getWalletOrThrow(userId);

    const updated = await this.walletRepository.captureHeldBalance(
      wallet._id.toString(),
      amount,
    );
    if (!updated) throw new InsufficientFundsException();

    // TODO: createTransaction(CAPTURE) — Phase 2
    return updated;
  }
}
