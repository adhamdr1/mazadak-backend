import {
  Resolver,
  Query,
  Mutation,
  Subscription,
  Args,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { Inject, UnauthorizedException, UseGuards } from '@nestjs/common';
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
import { PUB_SUB } from '../infrastructure/pubsub/pubsub.provider';
import { PUB_SUB_EVENTS } from '../infrastructure/pubsub/events.constants';
import type { RedisPubSub } from 'graphql-redis-subscriptions';

@Resolver(() => Wallet)
@UseGuards(JwtAuthGuard)
export class WalletResolver {
  constructor(
    private readonly walletService: WalletService,
    private readonly transactionService: TransactionService,
    @Inject(PUB_SUB)
    private readonly pubSub: RedisPubSub,
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

  // ─── Subscriptions ────────────────────────────────────────────────────────

  /**
   * Real-time subscription: delivers wallet balance and held updates only to the owner.
   * Security: userId is strictly filtered against the authenticated WebSocket context.
   */
  @Subscription(() => Wallet, {
    name: 'walletUpdated',
    filter: (
      payload: { walletUpdated: Wallet },
      _variables: Record<string, never>,
      context: { user?: JwtPayload },
    ) => {
      if (!context.user) return false;
      return (
        context.user.role === UserRole.ADMIN ||
        payload.walletUpdated.userId.toString() === context.user.sub
      );
    },
  })
  walletUpdated(@CurrentUser() user: JwtPayload) {
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required to subscribe to wallet updates',
      );
    }
    return this.pubSub.asyncIterableIterator(
      PUB_SUB_EVENTS.WALLET_UPDATED,
    ) as AsyncIterable<{ walletUpdated: Wallet }>;
  }
}
