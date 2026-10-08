import {
  Resolver,
  Query,
  Mutation,
  Subscription,
  Args,
  ID,
} from '@nestjs/graphql';
import { Inject, UnauthorizedException, UseGuards } from '@nestjs/common';
import { WithdrawalsService } from '../../withdrawals/withdrawals.service';
import { WithdrawalRequest } from '../../withdrawals/entities/withdrawal-request.entity';
import { WithdrawalsPage, WithdrawalsFilterInput } from '../../withdrawals/dto';
import {
  AdminCompleteWithdrawalInput,
  AdminRejectWithdrawalInput,
} from '../dto';
import { PaginationInput } from '../../common/dto/pagination.input';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { PUB_SUB } from '../../infrastructure/pubsub/pubsub.provider';
import { PUB_SUB_EVENTS } from '../../infrastructure/pubsub/events.constants';
import type { RedisPubSub } from 'graphql-redis-subscriptions';

@Resolver(() => WithdrawalRequest)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminWithdrawalsResolver {
  constructor(
    private readonly withdrawalsService: WithdrawalsService,
    @Inject(PUB_SUB)
    private readonly pubSub: RedisPubSub,
  ) {}

  // ─── Queries ──────────────────────────────────────────────────────────────

  @Query(() => WithdrawalsPage, { name: 'adminGetWithdrawals' })
  async adminGetWithdrawals(
    @Args('pagination') pagination: PaginationInput,
    @Args('filter', { nullable: true }) filter?: WithdrawalsFilterInput,
  ): Promise<WithdrawalsPage> {
    return this.withdrawalsService.adminGetWithdrawals(pagination, filter);
  }

  @Query(() => WithdrawalRequest, { name: 'adminGetWithdrawal' })
  async adminGetWithdrawal(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<WithdrawalRequest> {
    return this.withdrawalsService.adminGetWithdrawal(id);
  }

  // ─── Mutations ────────────────────────────────────────────────────────────

  @Mutation(() => WithdrawalRequest, { name: 'adminStartWithdrawalProcessing' })
  async adminStartWithdrawalProcessing(
    @CurrentUser() admin: JwtPayload,
    @Args('requestId', { type: () => ID }) requestId: string,
  ): Promise<WithdrawalRequest> {
    return this.withdrawalsService.adminStartProcessing(admin.sub, requestId);
  }

  @Mutation(() => WithdrawalRequest, { name: 'adminCompleteWithdrawal' })
  async adminCompleteWithdrawal(
    @CurrentUser() admin: JwtPayload,
    @Args('input') input: AdminCompleteWithdrawalInput,
  ): Promise<WithdrawalRequest> {
    return this.withdrawalsService.adminCompleteWithdrawal(admin.sub, input);
  }

  @Mutation(() => WithdrawalRequest, { name: 'adminRejectWithdrawal' })
  async adminRejectWithdrawal(
    @CurrentUser() admin: JwtPayload,
    @Args('input') input: AdminRejectWithdrawalInput,
  ): Promise<WithdrawalRequest> {
    return this.withdrawalsService.adminRejectWithdrawal(admin.sub, input);
  }

  // ─── Subscriptions ────────────────────────────────────────────────────────

  @Subscription(() => WithdrawalRequest, {
    name: 'adminWithdrawalFeed',
    resolve: (payload: {
      withdrawalRequested?: WithdrawalRequest;
      withdrawalStatusChanged?: WithdrawalRequest;
      adminWithdrawalFeed?: WithdrawalRequest;
    }) =>
      payload.adminWithdrawalFeed ||
      payload.withdrawalRequested ||
      payload.withdrawalStatusChanged,
  })
  adminWithdrawalFeed(@CurrentUser() user?: JwtPayload) {
    if (!user || user.role !== UserRole.ADMIN) {
      throw new UnauthorizedException(
        'Admin privilege required to subscribe to admin withdrawal feed',
      );
    }
    return this.pubSub.asyncIterableIterator([
      PUB_SUB_EVENTS.WITHDRAWAL_REQUESTED,
      PUB_SUB_EVENTS.WITHDRAWAL_STATUS_CHANGED,
    ]) as AsyncIterable<{
      withdrawalRequested?: WithdrawalRequest;
      withdrawalStatusChanged?: WithdrawalRequest;
    }>;
  }
}
