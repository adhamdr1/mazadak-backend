import {
  Resolver,
  Query,
  Mutation,
  Args,
  Subscription,
  ID,
} from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Public } from '../common/decorators/public.decorator';
import { BidsService } from './bids.service';
import { PUB_SUB_EVENTS } from '../infrastructure/pubsub/events.constants';
import { Bid } from './entities/bid.entity';
import { PlaceBidInput } from './dto/place-bid.input';
import { BidsFilterInput } from './dto/bids-filter.input';
import { BidsPage } from './dto/bids-page.type';
import { PaginationInput } from '../common/dto/pagination.input';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { BidAddedPayload } from './dto/bid-added.payload';
import type { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from '../infrastructure/pubsub/pubsub.provider';

@Resolver(() => Bid)
export class BidsResolver {
  constructor(
    private readonly bidsService: BidsService,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
  ) {}

  @Public()
  @Query(() => BidsPage, { name: 'auctionBids' })
  async getAuctionBids(
    @Args('auctionId') auctionId: string,
    @Args('input') input: PaginationInput,
    @Args('filter', { nullable: true })
    filter: BidsFilterInput = new BidsFilterInput(),
  ): Promise<BidsPage> {
    return this.bidsService.getAuctionBids(auctionId, input, filter);
  }

  @Query(() => BidsPage, { name: 'adminBids' })
  @Roles(UserRole.ADMIN)
  async adminBids(
    @Args('input') input: PaginationInput,
    @Args('filter', { nullable: true })
    filter: BidsFilterInput = new BidsFilterInput(),
  ): Promise<BidsPage> {
    return this.bidsService.adminGetAllBids(input, filter);
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => Bid, { name: 'placeBid' })
  async placeBid(
    @CurrentUser() user: JwtPayload,
    @Args('input') input: PlaceBidInput,
  ): Promise<Bid> {
    return this.bidsService.placeBid(user.sub, input);
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => BidsPage, { name: 'myBids' })
  async getMyBids(
    @CurrentUser() user: JwtPayload,
    @Args('input') input: PaginationInput,
    @Args('filter', { nullable: true })
    filter: BidsFilterInput = new BidsFilterInput(),
  ): Promise<BidsPage> {
    return this.bidsService.getMyBids(user.sub, input, filter);
  }

  /**
   * Real-time subscription: fires whenever a new bid is placed on an auction.
   * Public — no auth required to watch bids on a live auction.
   * Filter: only delivers events for the requested auctionId.
   */
  @Public()
  @Subscription(() => BidAddedPayload, {
    name: 'bidAdded',
    filter: (
      payload: { bidAdded: BidAddedPayload },
      variables: { auctionId: string },
    ) => payload.bidAdded.bid.auctionId.toString() === variables.auctionId,
  })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  bidAdded(@Args('auctionId', { type: () => ID }) _auctionId: string) {
    // asyncIterableIterator is typed as `any` in graphql-redis-subscriptions;
    // the cast to AsyncIterable is safe because RedisPubSub conforms to the interface.
    return this.pubSub.asyncIterableIterator(
      PUB_SUB_EVENTS.BID_ADDED,
    ) as AsyncIterable<{
      bidAdded: BidAddedPayload;
    }>;
  }
}
