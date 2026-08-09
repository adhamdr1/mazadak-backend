import { Resolver, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionsPage } from './dto/transactions-page.type';
import { TransactionsFilterInput } from './dto/transactions-filter.input';
import { PaginationInput } from '../common/dto/pagination.input';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@Resolver()
@UseGuards(JwtAuthGuard)
export class TransactionResolver {
  constructor(private readonly transactionService: TransactionService) {}

  @Query(() => TransactionsPage, { name: 'transactions' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async transactions(
    @Args('input', { nullable: true })
    input: PaginationInput = new PaginationInput(),
    @Args('filter', { nullable: true })
    filter?: TransactionsFilterInput,
  ): Promise<TransactionsPage> {
    return this.transactionService.getAllTransactions(input, filter);
  }
}
