import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { EscrowService } from '../services';
import { Escrow } from '../entities';
import { EscrowsPage, EscrowFilterInput } from '../dto';
import { PaginationInput } from '../../common/dto/pagination.input';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { EscrowUnauthorizedException } from '../exceptions';

@Resolver(() => Escrow)
@UseGuards(JwtAuthGuard, RolesGuard)
export class EscrowResolver {
  constructor(private readonly escrowService: EscrowService) {}

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
}
