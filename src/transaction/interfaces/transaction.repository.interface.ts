import { Transaction } from '../entities/transaction.entity';
import { ClientSession } from 'mongoose';
import { TransactionType } from '../enums/transaction-type.enum';
import { TransactionStatus } from '../enums/transaction-status.enum';
import { TransactionsFilterInput } from '../dto/transactions-filter.input';
import { TransactionReferenceType } from '../enums/transaction-reference-type.enum';

export interface CreateTransactionData {
  walletId: string;
  type: TransactionType;
  amount: number;
  currency?: string;
  status: TransactionStatus;
  referenceId?: string;
  idempotencyKey?: string;
  gatewayPaymentIntentId?: string;
  gatewayTransactionId?: string;
  gatewayProvider?: string;
  referenceType?: TransactionReferenceType;
  expiresAt?: Date;
  hasChild?: boolean;
}

export interface ITransactionRepository {
  create(
    data: CreateTransactionData,
    session?: ClientSession,
  ): Promise<Transaction>;

  findById(id: string, session?: ClientSession): Promise<Transaction | null>;

  markHasChild(
    id: string,
    session?: ClientSession,
  ): Promise<Transaction | null>;

  updateGatewayPaymentIntentId(
    id: string,
    gatewayPaymentIntentId: string,
    session?: ClientSession,
  ): Promise<Transaction | null>;

  markWalletCredited(
    id: string,
    session?: ClientSession,
  ): Promise<Transaction | null>;

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
