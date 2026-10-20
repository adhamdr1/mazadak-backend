import { TransactionService } from '../../transaction/transaction.service';
import { WalletService } from '../../wallet/wallet.service';
import { UsersService } from '../../users/users.service';
import { TransactionsPage } from '../../transaction/dto/transactions-page.type';
import { PaginationInput } from '../../common/dto/pagination.input';
import { TransactionsFilterInput } from '../../transaction/dto/transactions-filter.input';
export declare class AdminTransactionsResolver {
    private readonly transactionService;
    private readonly walletService;
    private readonly usersService;
    constructor(transactionService: TransactionService, walletService: WalletService, usersService: UsersService);
    adminGetTransactions(input: PaginationInput, filter?: TransactionsFilterInput): Promise<TransactionsPage>;
}
