import { TransactionType } from '../enums/transaction-type.enum';
import { TransactionStatus } from '../enums/transaction-status.enum';
import { TransactionsSortInput } from './transactions-sort.input';
export declare class TransactionsFilterInput {
    search?: string;
    walletId?: string;
    walletIds?: string[];
    userId?: string;
    type?: TransactionType;
    status?: TransactionStatus;
    startDate?: Date;
    endDate?: Date;
    expiresAtBefore?: Date;
    hasChild?: boolean;
    sort?: TransactionsSortInput;
}
