import { Resolver, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import { TransactionService } from '../../transaction/transaction.service';
import { TransactionsPage } from '../../transaction/dto/transactions-page.type';
import { PaginationInput } from '../../common/dto/pagination.input';
import { TransactionsFilterInput } from '../../transaction/dto/transactions-filter.input';

@Resolver()
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminTransactionsResolver {
  constructor(private readonly transactionService: TransactionService) {}

  @Query(() => TransactionsPage)
  async adminGetTransactions(
    @Args('input') input: PaginationInput,
    @Args('filter', { nullable: true }) filter: TransactionsFilterInput,
  ): Promise<TransactionsPage> {
    return this.transactionService.getAllTransactions(input, filter || {});
  }
}
