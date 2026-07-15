import { Transaction } from '../entities/transaction.entity';
import { TransactionType } from '../enums/transaction-type.enum';
import { TransactionStatus } from '../enums/transaction-status.enum';

export interface CreateTransactionData {
  walletId: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  referenceId?: string;
}

export interface ITransactionRepository {
  create(data: CreateTransactionData): Promise<Transaction>;

  findByWalletId(
    walletId: string,
    page: number,
    limit: number,
    type?: TransactionType,
  ): Promise<Transaction[]>;

  countByWalletId(walletId: string, type?: TransactionType): Promise<number>;
}
