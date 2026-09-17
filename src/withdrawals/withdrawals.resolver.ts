import {
  Resolver,
  Query,
  Mutation,
  Subscription,
  Args,
  ID,
} from '@nestjs/graphql';
import { Inject, UnauthorizedException, UseGuards } from '@nestjs/common';
import { WithdrawalsService } from './withdrawals.service';
import { WithdrawalRequest } from './entities/withdrawal-request.entity';
import { PayoutMethod } from './enums/payout-method.enum';
import {
  RequestWithdrawalInput,
  WithdrawalsFilterInput,
  WithdrawalsPage,
  WithdrawalFeePreview,
} from './dto';
import { PaginationInput } from '../common/dto/pagination.input';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PUB_SUB } from '../infrastructure/pubsub/pubsub.provider';
import { PUB_SUB_EVENTS } from '../infrastructure/pubsub/events.constants';
import type { RedisPubSub } from 'graphql-redis-subscriptions';

@Resolver(() => WithdrawalRequest)
export class WithdrawalsResolver {
  constructor(
    private readonly withdrawalsService: WithdrawalsService,
    @Inject(PUB_SUB)
    private readonly pubSub: RedisPubSub,
  ) {}

  // ─── Queries ──────────────────────────────────────────────────────────────

  @Query(() => WithdrawalFeePreview, { name: 'withdrawalFeePreview' })
  withdrawalFeePreview(
    @Args('amount') amount: number,
    @Args('payoutMethod', { type: () => PayoutMethod })
    payoutMethod: PayoutMethod,
  ): WithdrawalFeePreview {
    return this.withdrawalsService.calculateFee(amount, payoutMethod);
  }

  @Query(() => WithdrawalsPage, { name: 'myWithdrawals' })
  @UseGuards(JwtAuthGuard)
  async myWithdrawals(
    @CurrentUser() currentUser: JwtPayload,
    @Args('pagination') pagination: PaginationInput,
    @Args('filter', { nullable: true }) filter?: WithdrawalsFilterInput,
  ): Promise<WithdrawalsPage> {
    return this.withdrawalsService.getMyWithdrawals(
      currentUser.sub,
      pagination,
      filter,
    );
  }

  @Query(() => WithdrawalRequest, { name: 'myWithdrawal' })
  @UseGuards(JwtAuthGuard)
  async myWithdrawal(
    @CurrentUser() currentUser: JwtPayload,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<WithdrawalRequest> {
    return this.withdrawalsService.getMyWithdrawal(currentUser.sub, id);
  }

  // ─── Mutations ────────────────────────────────────────────────────────────

  @Mutation(() => WithdrawalRequest, { name: 'requestWithdrawal' })
  @UseGuards(JwtAuthGuard)
  async requestWithdrawal(
    @CurrentUser() currentUser: JwtPayload,
    @Args('input') input: RequestWithdrawalInput,
  ): Promise<WithdrawalRequest> {
    return this.withdrawalsService.requestWithdrawal(currentUser.sub, input);
  }

  @Mutation(() => WithdrawalRequest, { name: 'cancelWithdrawal' })
  @UseGuards(JwtAuthGuard)
  async cancelWithdrawal(
    @CurrentUser() currentUser: JwtPayload,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<WithdrawalRequest> {
    return this.withdrawalsService.cancelWithdrawal(currentUser.sub, id);
  }

  // ─── Subscriptions ────────────────────────────────────────────────────────

  @Subscription(() => WithdrawalRequest, {
    name: 'myWithdrawalUpdated',
    filter: (
      payload: { withdrawalStatusChanged: WithdrawalRequest },
      _variables: Record<string, never>,
      context: { user?: JwtPayload },
    ) => {
      if (!context.user) return false;
      return (
        payload.withdrawalStatusChanged.userId.toString() === context.user.sub
      );
    },
    resolve: (payload: { withdrawalStatusChanged: WithdrawalRequest }) =>
      payload.withdrawalStatusChanged,
  })
  myWithdrawalUpdated(@CurrentUser() user: JwtPayload) {
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required to subscribe to withdrawal updates',
      );
    }
    return this.pubSub.asyncIterableIterator(
      PUB_SUB_EVENTS.WITHDRAWAL_STATUS_CHANGED,
    ) as AsyncIterable<{ withdrawalStatusChanged: WithdrawalRequest }>;
  }
}
