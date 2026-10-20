import { TransactionService } from './transaction.service';
import { TransactionsPage } from './dto/transactions-page.type';
import { TransactionsFilterInput } from './dto/transactions-filter.input';
import { PaginationInput } from '../common/dto/pagination.input';
export declare class TransactionResolver {
    private readonly transactionService;
    constructor(transactionService: TransactionService);
    transactions(input?: PaginationInput, filter?: TransactionsFilterInput): Promise<TransactionsPage>;
}
