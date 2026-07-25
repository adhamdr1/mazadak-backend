import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuctionsService } from './auctions.service';
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

@Resolver(() => Auction)
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuctionsResolver {
  constructor(private readonly auctionsService: AuctionsService) {}

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
}
