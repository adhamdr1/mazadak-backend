import { Wallet } from '../entities/wallet.entity';

export interface IWalletRepository {
  create(userId: string): Promise<Wallet>;

  findByUserId(userId: string): Promise<Wallet | null>;

  findById(walletId: string): Promise<Wallet | null>;

  creditBalance(walletId: string, amount: number): Promise<Wallet | null>;

  debitBalance(walletId: string, amount: number): Promise<Wallet | null>;

  holdBalance(walletId: string, amount: number): Promise<Wallet | null>;

  releaseBalance(walletId: string, amount: number): Promise<Wallet | null>;

  captureHeldBalance(walletId: string, amount: number): Promise<Wallet | null>;
}
