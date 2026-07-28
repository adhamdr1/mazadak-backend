import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  Subscription,
} from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common';
import { AuctionsService } from './auctions.service';
import { PUB_SUB_EVENTS } from '../infrastructure/pubsub/events.constants';
import { Auction } from './entities/auction.entity';
import { CreateAuctionInput } from './dto/create-auction.input';
import { UpdateAuctionInput } from './dto/update-auction.input';
import { AuctionsFilterInput } from './dto/auctions-filter.input';
import { AuctionsPage } from './dto/auctions-page.type';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PaginationInput } from '../common/dto/pagination.input';
import { AuctionStatusChangedPayload } from './dto/auction-status-changed.payload';
import type { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from '../infrastructure/pubsub/pubsub.provider';

@Resolver(() => Auction)
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuctionsResolver {
  constructor(
    private readonly auctionsService: AuctionsService,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
  ) {}

  // ─── Queries ──────────────────────────────────────────────────────────────

  @Public()
  @Query(() => AuctionsPage, { name: 'auctions' })
  async getAuctions(
    @Args('input') input: PaginationInput,
    @Args('filter', { nullable: true })
    filter: AuctionsFilterInput = new AuctionsFilterInput(),
  ): Promise<AuctionsPage> {
    return this.auctionsService.findAuctions(input, filter);
  }

  @Query(() => AuctionsPage, { name: 'adminAuctions' })
  @Roles(UserRole.ADMIN)
  async adminAuctions(
    @Args('input') input: PaginationInput,
    @Args('filter', { nullable: true })
    filter: AuctionsFilterInput = new AuctionsFilterInput(),
  ): Promise<AuctionsPage> {
    return this.auctionsService.findAllForAdmin(input, filter);
  }

  @Public()
  @Query(() => Auction, { name: 'auction' })
  async getAuction(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Auction> {
    return this.auctionsService.findAuction(id);
  }

  @Query(() => AuctionsPage, { name: 'myAuctions' })
  async getMyAuctions(
    @CurrentUser() currentUser: JwtPayload,
    @Args('input') input: PaginationInput,
    @Args('filter', { nullable: true })
    filter: AuctionsFilterInput = new AuctionsFilterInput(),
  ): Promise<AuctionsPage> {
    return this.auctionsService.findMyAuctions(currentUser.sub, input, filter);
  }

  @Query(() => AuctionsPage, { name: 'myWonAuctions' })
  async getMyWonAuctions(
    @CurrentUser() currentUser: JwtPayload,
    @Args('input') input: PaginationInput,
    @Args('filter', { nullable: true })
    filter: AuctionsFilterInput = new AuctionsFilterInput(),
  ): Promise<AuctionsPage> {
    return this.auctionsService.findWonAuctions(currentUser.sub, input, filter);
  }

  // ─── Mutations ────────────────────────────────────────────────────────────

  @Mutation(() => Auction)
  async createAuction(
    @CurrentUser() currentUser: JwtPayload,
    @Args('input') input: CreateAuctionInput,
  ): Promise<Auction> {
    return this.auctionsService.createAuction(currentUser.sub, input);
  }

  @Mutation(() => Auction)
  async updateAuction(
    @CurrentUser() currentUser: JwtPayload,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateAuctionInput,
  ): Promise<Auction> {
    return this.auctionsService.updateAuction(id, currentUser.sub, input);
  }

  @Mutation(() => Boolean)
  async cancelAuction(
    @CurrentUser() currentUser: JwtPayload,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.auctionsService.cancelAuction(
      id,
      currentUser.sub,
      currentUser.role,
    );
  }

  /**
   * Real-time subscription: fires when an auction status changes.
   * Covers: PENDING→ACTIVE (Cron), ACTIVE→ENDED (Cron), any→CANCELLED (manual).
   * Public — anyone watching an auction page should receive status updates.
   * Filter: only delivers events for the requested auctionId.
   */
  @Public()
  @Subscription(() => AuctionStatusChangedPayload, {
    name: 'auctionStatusChanged',
    filter: (
      payload: { auctionStatusChanged: AuctionStatusChangedPayload },
      variables: { auctionId: string },
    ) =>
      payload.auctionStatusChanged.auction._id.toString() ===
      variables.auctionId,
  })
  auctionStatusChanged(
    // auctionId is declared in the schema via @Args for the filter function;
    // it is intentionally unused in the method body (filter reads from variables).
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Args('auctionId', { type: () => ID }) _id: string,
  ) {
    return this.pubSub.asyncIterableIterator(
      PUB_SUB_EVENTS.AUCTION_STATUS_CHANGED,
    ) as AsyncIterable<{ auctionStatusChanged: AuctionStatusChangedPayload }>;
  }
}
