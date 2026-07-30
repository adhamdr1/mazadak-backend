import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import { UsersService } from '../../users/users.service';
import { WalletService } from '../../wallet/wallet.service';
import { AuctionsService } from '../../auctions/auctions.service';
import { TransactionService } from '../../transaction/transaction.service';
import { User } from '../../users/entities/user.entity';
import { UsersPage } from '../../users/dto/users-page.type';
import { PaginationInput } from '../../common/dto/pagination.input';
import { UsersFilterInput } from '../../users/dto/users-filter.input';
import { AdminUserDetails } from '../dto/admin-user-details.dto';

@Resolver()
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminUsersResolver {
  constructor(
    private readonly usersService: UsersService,
    private readonly walletService: WalletService,
    private readonly auctionsService: AuctionsService,
    private readonly transactionService: TransactionService,
  ) {}

  @Query(() => UsersPage)
  async adminGetUsers(
    @Args('input') input: PaginationInput,
    @Args('filter', { nullable: true }) filter: UsersFilterInput,
  ): Promise<UsersPage> {
    return this.usersService.findAll(input, filter || {});
  }

  @Query(() => AdminUserDetails)
  async adminGetUserDetails(
    @Args('userId', { type: () => ID }) userId: string,
  ): Promise<AdminUserDetails> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const defaultPagination: PaginationInput = { page: 1, limit: 5 };

    const wallet = await this.walletService
      .getWalletByUserId(userId)
      .catch(() => undefined);

    const recentAuctions = await this.auctionsService
      .findMyAuctions(userId, defaultPagination, {})
      .catch(() => undefined);

    const recentTransactions = await this.transactionService
      .getMyTransactions(userId, defaultPagination)
      .catch(() => undefined);

    return {
      user,
      wallet,
      recentAuctions,
      recentTransactions,
    };
  }

  @Mutation(() => User)
  async adminToggleUserBan(
    @Args('userId', { type: () => ID }) userId: string,
  ): Promise<User> {
    return this.usersService.toggleBan(userId);
  }
}
