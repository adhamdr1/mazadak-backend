import { Resolver, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import { TransactionService } from '../../transaction/transaction.service';
import { WalletService } from '../../wallet/wallet.service';
import { TransactionsPage } from '../../transaction/dto/transactions-page.type';
import { PaginationInput } from '../../common/dto/pagination.input';
import { TransactionsFilterInput } from '../../transaction/dto/transactions-filter.input';

@Resolver()
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminTransactionsResolver {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly walletService: WalletService,
  ) {}

  @Query(() => TransactionsPage)
  async adminGetTransactions(
    @Args('input') input: PaginationInput,
    @Args('filter', { nullable: true }) filter?: TransactionsFilterInput,
  ): Promise<TransactionsPage> {
    const effectiveFilter = { ...(filter || {}) };

    if (effectiveFilter.userId && !effectiveFilter.walletId) {
      try {
        const wallet = await this.walletService.getWalletByUserId(
          effectiveFilter.userId,
        );
        effectiveFilter.walletId = wallet._id.toString();
      } catch {
        return {
          items: [],
          total: 0,
          totalPages: 0,
          hasNextPage: false,
        };
      }
    }

    return this.transactionService.getAllTransactions(input, effectiveFilter);
  }
}
