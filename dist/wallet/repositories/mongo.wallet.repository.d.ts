import { ClientSession, Model } from 'mongoose';
import { IWalletRepository } from '../interfaces/wallet.repository.interface';
import { Wallet, WalletDocument } from '../entities/wallet.entity';
export declare class MongoWalletRepository implements IWalletRepository {
    private readonly walletModel;
    constructor(walletModel: Model<WalletDocument>);
    create(userId: string, session?: ClientSession): Promise<Wallet>;
    findByUserId(userId: string, session?: ClientSession): Promise<Wallet | null>;
    findByUserIds(userIds: string[]): Promise<Wallet[]>;
    findById(walletId: string): Promise<Wallet | null>;
    findAll(page: number, limit: number): Promise<Wallet[]>;
    countAll(): Promise<number>;
    sumAllBalances(): Promise<number>;
    sumHeldBalances(): Promise<number>;
    creditBalance(walletId: string, amount: number, session?: ClientSession): Promise<Wallet | null>;
    debitBalance(walletId: string, amount: number, session?: ClientSession): Promise<Wallet | null>;
    holdBalance(walletId: string, amount: number, session?: ClientSession): Promise<Wallet | null>;
    releaseBalance(walletId: string, amount: number, session?: ClientSession): Promise<Wallet | null>;
    captureHeldBalance(walletId: string, amount: number, session?: ClientSession): Promise<Wallet | null>;
}
