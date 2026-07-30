import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import { AuctionsService } from '../../auctions/auctions.service';
import { AuctionsPage } from '../../auctions/dto/auctions-page.type';
import { PaginationInput } from '../../common/dto/pagination.input';
import { AuctionsFilterInput } from '../../auctions/dto/auctions-filter.input';

@Resolver()
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminAuctionsResolver {
  constructor(private readonly auctionsService: AuctionsService) {}

  @Query(() => AuctionsPage)
  async adminGetAuctions(
    @Args('input') input: PaginationInput,
    @Args('filter', { nullable: true }) filter: AuctionsFilterInput,
  ): Promise<AuctionsPage> {
    return this.auctionsService.findAllForAdmin(input, filter || {});
  }

  @Mutation(() => Boolean)
  async adminCancelAuction(
    @Args('auctionId', { type: () => ID }) auctionId: string,
    @Args('reason') reason: string,
  ): Promise<boolean> {
    return this.auctionsService.adminCancelAuction(auctionId, reason);
  }
}
