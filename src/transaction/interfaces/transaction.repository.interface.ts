import { Transaction } from '../entities/transaction.entity';
import { TransactionType } from '../enums/transaction-type.enum';
import { TransactionStatus } from '../enums/transaction-status.enum';
import { TransactionsFilterInput } from '../dto/transactions-filter.input';

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
    filter?: TransactionsFilterInput,
  ): Promise<Transaction[]>;

  countByWalletId(
    walletId: string,
    filter?: TransactionsFilterInput,
  ): Promise<number>;

  findAll(
    page: number,
    limit: number,
    filter?: TransactionsFilterInput,
  ): Promise<Transaction[]>;

  countAll(filter?: TransactionsFilterInput): Promise<number>;

  sumTodayRevenue(): Promise<number>;
}
