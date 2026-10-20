import { Transaction } from '../entities/transaction.entity';
export declare class TransactionsPage {
    items: Transaction[];
    total: number;
    totalPages: number;
    hasNextPage: boolean;
}
