import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Public } from '../common/decorators/public.decorator';
import { BidsService } from './bids.service';
import { Bid } from './entities/bid.entity';
import { PlaceBidInput } from './dto/place-bid.input';
import { BidsFilterInput } from './dto/bids-filter.input';
import { BidsPage } from './dto/bids-page.type';

@Resolver(() => Bid)
export class BidsResolver {
  constructor(private readonly bidsService: BidsService) {}

  @Public()
  @Query(() => BidsPage, { name: 'auctionBids' })
  async getAuctionBids(
    @Args('auctionId') auctionId: string,
    @Args('filter', { nullable: true })
    filter: BidsFilterInput = new BidsFilterInput(),
  ): Promise<BidsPage> {
    return this.bidsService.getAuctionBids(auctionId, filter);
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
    @Args('filter', { nullable: true })
    filter: BidsFilterInput = new BidsFilterInput(),
  ): Promise<BidsPage> {
    return this.bidsService.getMyBids(user.sub, filter);
  }
}
