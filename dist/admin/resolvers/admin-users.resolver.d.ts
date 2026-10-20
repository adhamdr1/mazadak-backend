import { UsersService } from '../../users/users.service';
import { WalletService } from '../../wallet/wallet.service';
import { AuctionsService } from '../../auctions/auctions.service';
import { TransactionService } from '../../transaction/transaction.service';
import { User } from '../../users/entities/user.entity';
import { UsersPage } from '../../users/dto/users-page.type';
import { PaginationInput } from '../../common/dto/pagination.input';
import { UsersFilterInput } from '../../users/dto/users-filter.input';
import { AdminUserDetails } from '../dto/admin-user-details.dto';
export declare class AdminUsersResolver {
    private readonly usersService;
    private readonly walletService;
    private readonly auctionsService;
    private readonly transactionService;
    constructor(usersService: UsersService, walletService: WalletService, auctionsService: AuctionsService, transactionService: TransactionService);
    adminGetUsers(input: PaginationInput, filter: UsersFilterInput): Promise<UsersPage>;
    adminGetUserDetails(userId: string): Promise<AdminUserDetails>;
    adminToggleUserBan(userId: string): Promise<User>;
}
