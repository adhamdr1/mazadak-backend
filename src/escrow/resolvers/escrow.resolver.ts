import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  ResolveField,
  Parent,
  Int,
  Subscription,
} from '@nestjs/graphql';
import { UseGuards, Inject } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { EscrowService } from '../services';
import { Escrow } from '../entities';
import {
  EscrowsPage,
  EscrowFilterInput,
  EscrowStatusChangedPayload,
  EscrowStatusChangedInternalPayload,
} from '../dto';
import { PaginationInput } from '../../common/dto/pagination.input';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { EscrowUnauthorizedException } from '../exceptions';
import { PUB_SUB } from '../../infrastructure/pubsub/pubsub.provider';
import { PUB_SUB_EVENTS } from '../../infrastructure/pubsub/events.constants';
import { Auction } from '../../auctions/entities/auction.entity';
import { GetAuctionByIdQuery } from '../../auctions/queries/get-auction-by-id.query';

@Resolver(() => Escrow)
@UseGuards(JwtAuthGuard, RolesGuard)
export class EscrowResolver {
  constructor(
    private readonly escrowService: EscrowService,
    private readonly queryBus: QueryBus,
    @Inject(PUB_SUB)
    private readonly pubSub: RedisPubSub,
  ) {}

  // ─── Field Resolvers ────────────────────────────────────────────────────────

  /**
   * Resolves nested auction details for an escrow.
   */
  @ResolveField(() => Auction, { nullable: true })
  async auction(@Parent() escrow: Escrow): Promise<Auction | null> {
    if (!escrow.auctionId) return null;
    return this.queryBus.execute<GetAuctionByIdQuery, Auction | null>(
      new GetAuctionByIdQuery(escrow.auctionId.toString()),
    );
  }

  /**
   * Resolves inspection duration in hours.
   */
  @ResolveField(() => Int, { name: 'inspectionDurationHours' })
  inspectionDurationHours(): number {
    return 168;
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  /**
   * Retrieves an escrow hold for a specific auction.
   * Only buyer, seller, or admin can access.
   */
  @Query(() => Escrow, { name: 'escrowByAuction', nullable: true })
  async getEscrowByAuction(
    @Args('auctionId', { type: () => ID }) auctionId: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<Escrow | null> {
    const escrow = await this.escrowService.getEscrowByAuctionId(auctionId);
    if (!escrow) return null;

    const isBuyer = escrow.buyerId.toString() === currentUser.sub;
    const isSeller = escrow.sellerId.toString() === currentUser.sub;
    const isAdmin = currentUser.role === UserRole.ADMIN;

    if (!isBuyer && !isSeller && !isAdmin) {
      throw new EscrowUnauthorizedException();
    }

    return escrow;
  }

  /**
   * Retrieves a single escrow hold by ID.
   * Only buyer, seller, or admin can access.
   */
  @Query(() => Escrow, { name: 'escrow' })
  async getEscrow(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<Escrow> {
    const escrow = await this.escrowService.getEscrowById(id);

    const isBuyer = escrow.buyerId.toString() === currentUser.sub;
    const isSeller = escrow.sellerId.toString() === currentUser.sub;
    const isAdmin = currentUser.role === UserRole.ADMIN;

    if (!isBuyer && !isSeller && !isAdmin) {
      throw new EscrowUnauthorizedException();
    }

    return escrow;
  }

  /**
   * Retrieves paginated escrows for the current authenticated user (as buyer or seller).
   */
  @Query(() => EscrowsPage, { name: 'myEscrows' })
  async getMyEscrows(
    @CurrentUser() currentUser: JwtPayload,
    @Args('input', { nullable: true }) input?: PaginationInput,
    @Args('filter', { nullable: true }) filter?: EscrowFilterInput,
  ): Promise<EscrowsPage> {
    return this.escrowService.getMyEscrows(currentUser.sub, input, filter);
  }

  /**
   * Admin: Retrieves all escrows paginated with filters.
   */
  @Roles(UserRole.ADMIN)
  @Query(() => EscrowsPage, { name: 'allEscrows' })
  async getAllEscrows(
    @Args('input', { nullable: true }) input?: PaginationInput,
    @Args('filter', { nullable: true }) filter?: EscrowFilterInput,
  ): Promise<EscrowsPage> {
    return this.escrowService.getAllEscrows(input, filter);
  }

  // ─── Mutations ────────────────────────────────────────────────────────────

  /**
   * Buyer confirms delivery of item in satisfactory condition, releasing funds immediately to seller.
   */
  @Mutation(() => Escrow, { name: 'confirmDelivery' })
  async confirmDelivery(
    @CurrentUser() currentUser: JwtPayload,
    @Args('escrowId', { type: () => ID }) escrowId: string,
  ): Promise<Escrow> {
    return this.escrowService.confirmDelivery(currentUser.sub, escrowId);
  }

  /**
   * Admin manual release of escrow funds to seller.
   */
  @Roles(UserRole.ADMIN)
  @Mutation(() => Escrow, { name: 'releaseEscrow' })
  async releaseEscrow(
    @Args('escrowId', { type: () => ID }) escrowId: string,
    @Args('reason', { nullable: true }) reason?: string,
  ): Promise<Escrow> {
    return this.escrowService.releaseEscrow(
      escrowId,
      reason ?? 'Admin manual release',
    );
  }

  /**
   * Admin manual refund of escrow funds to buyer.
   */
  @Roles(UserRole.ADMIN)
  @Mutation(() => Escrow, { name: 'refundEscrow' })
  async refundEscrow(
    @Args('escrowId', { type: () => ID }) escrowId: string,
    @Args('reason', { nullable: true }) reason?: string,
  ): Promise<Escrow> {
    return this.escrowService.refundEscrow(
      escrowId,
      reason ?? 'Admin manual refund',
    );
  }

  // ─── Subscriptions ────────────────────────────────────────────────────────

  /**
   * Real-time subscription: fires whenever an escrow's status changes.
   * Only buyer, seller, or admin can receive updates for this escrow.
   */
  @Subscription(() => EscrowStatusChangedPayload, {
    name: 'escrowStatusChanged',
    filter: (
      payload: {
        escrowStatusChanged: EscrowStatusChangedInternalPayload;
      },
      variables: { escrowId: string },
      context: { user?: JwtPayload },
    ) => {
      if (!context.user) return false;
      const isTarget =
        payload.escrowStatusChanged.escrowId.toString() === variables.escrowId;
      const isAuthorized =
        payload.escrowStatusChanged.buyerId === context.user.sub ||
        payload.escrowStatusChanged.sellerId === context.user.sub ||
        context.user.role === UserRole.ADMIN;
      return isTarget && isAuthorized;
    },
    resolve: (payload: { escrowStatusChanged: EscrowStatusChangedPayload }) =>
      payload.escrowStatusChanged,
  })
  escrowStatusChanged(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Args('escrowId', { type: () => ID }) _escrowId: string,
  ) {
    return this.pubSub.asyncIterableIterator(
      PUB_SUB_EVENTS.ESCROW_STATUS_CHANGED,
    ) as AsyncIterable<{
      escrowStatusChanged: EscrowStatusChangedPayload;
    }>;
  }
}
