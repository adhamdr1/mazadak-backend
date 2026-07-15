import { Resolver, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionsPage } from './dto/transactions-page.type';
import { MyTransactionsInput } from './dto/my-transactions.input';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Resolver()
@UseGuards(JwtAuthGuard)
export class TransactionResolver {
  constructor(private readonly transactionService: TransactionService) {}

  @Query(() => TransactionsPage, { name: 'myTransactions' })
  async myTransactions(
    @CurrentUser() currentUser: JwtPayload,
    @Args('input', { nullable: true }) input: MyTransactionsInput = {},
  ): Promise<TransactionsPage> {
    return this.transactionService.getMyTransactions(currentUser.sub, input);
  }
}
