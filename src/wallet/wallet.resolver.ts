import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { Wallet } from './entities/wallet.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { TransactionService } from '../transaction/transaction.service';
import { TransactionsPage } from '../transaction/dto/transactions-page.type';
import { TransactionsFilterInput } from '../transaction/dto/transactions-filter.input';
import { WithdrawInput } from './dto/withdraw.input';
import { WalletsPage } from './dto/wallets-page.type';
import { PaginationInput } from '../common/dto/pagination.input';
import Decimal from 'decimal.js';

@Resolver(() => Wallet)
@UseGuards(JwtAuthGuard)
export class WalletResolver {
  constructor(
    private readonly walletService: WalletService,
    private readonly transactionService: TransactionService,
  ) {}

  // ─── Queries ──────────────────────────────────────────────────────────────

  @Query(() => WalletsPage, { name: 'wallets' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async wallets(@Args('input') input: PaginationInput): Promise<WalletsPage> {
    return this.walletService.getAllWallets(input);
  }

  @Query(() => Wallet, { name: 'adminGetWallet' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminGetWallet(@Args('userId') userId: string): Promise<Wallet> {
    return this.walletService.getWalletByUserId(userId);
  }

  @Query(() => Wallet, { name: 'myWallet' })
  async myWallet(@CurrentUser() currentUser: JwtPayload): Promise<Wallet> {
    return this.walletService.getMyWallet(currentUser.sub);
  }

  @Query(() => TransactionsPage, { name: 'myTransactions' })
  async myTransactions(
    @CurrentUser() currentUser: JwtPayload,
    @Args('input', { nullable: true })
    input: PaginationInput = new PaginationInput(),
    @Args('filter', { nullable: true })
    filter?: TransactionsFilterInput,
  ): Promise<TransactionsPage> {
    const wallet = await this.walletService.getMyWallet(currentUser.sub);
    return this.transactionService.getTransactionsByWalletId(
      wallet._id.toString(),
      input,
      filter,
    );
  }

  // ─── Computed Fields ──────────────────────────────────────────────────────

  @ResolveField(() => String, { name: 'availableBalance' })
  availableBalance(@Parent() wallet: Wallet): string {
    return new Decimal(wallet.balance.toString())
      .minus(wallet.heldBalance.toString())
      .toString();
  }

  // ─── Mutations (Mock — Stripe integration pending) ────────────────────────

  // Note: GraphQL Mutation `deposit` has been removed to prevent direct balance manipulation.
  // Manual deposits are now processed strictly via Payment Intents (initializePayment) and Webhook events.
  // Internal deposits are processed via WalletService.deposit internally.

  @Mutation(() => Wallet, { name: 'withdraw' })
  async withdraw(
    @CurrentUser() currentUser: JwtPayload,
    @Args('input') input: WithdrawInput,
  ): Promise<Wallet> {
    const { wallet } = await this.walletService.withdraw(
      currentUser.sub,
      input.amount,
    );
    return wallet;
  }
}
