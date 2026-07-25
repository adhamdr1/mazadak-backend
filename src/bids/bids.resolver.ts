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
import { PaginationInput } from '../common/dto/pagination.input';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@Resolver(() => Bid)
export class BidsResolver {
  constructor(private readonly bidsService: BidsService) {}

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
}
