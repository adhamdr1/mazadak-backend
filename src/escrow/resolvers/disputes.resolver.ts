import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { DisputesService } from '../services';
import { Dispute } from '../entities';
import {
  CreateDisputeInput,
  ResolveDisputeInput,
  UpdateDisputeStatusInput,
  DisputeFilterInput,
  DisputesPage,
} from '../dto';
import { PaginationInput } from '../../common/dto/pagination.input';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { EscrowUnauthorizedException } from '../exceptions';

@Resolver(() => Dispute)
@UseGuards(JwtAuthGuard, RolesGuard)
export class DisputesResolver {
  constructor(private readonly disputesService: DisputesService) {}

  // ─── Queries ──────────────────────────────────────────────────────────────

  /**
   * Retrieves a dispute by ID.
   * Only the openedBy user, againstUser, or an Admin may view.
   */
  @Query(() => Dispute, { name: 'dispute' })
  async getDispute(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<Dispute> {
    const dispute = await this.disputesService.getDisputeById(id);

    const isParty =
      dispute.openedById.toString() === currentUser.sub ||
      dispute.againstUserId.toString() === currentUser.sub;
    const isAdmin = currentUser.role === UserRole.ADMIN;

    if (!isParty && !isAdmin) {
      throw new EscrowUnauthorizedException();
    }

    return dispute;
  }

  /**
   * Retrieves a dispute for a specific auction.
   * Only parties or Admin may view.
   */
  @Query(() => Dispute, { name: 'disputeByAuction', nullable: true })
  async getDisputeByAuction(
    @Args('auctionId', { type: () => ID }) auctionId: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<Dispute | null> {
    const dispute = await this.disputesService.getDisputeByAuctionId(auctionId);
    if (!dispute) return null;

    const isParty =
      dispute.openedById.toString() === currentUser.sub ||
      dispute.againstUserId.toString() === currentUser.sub;
    const isAdmin = currentUser.role === UserRole.ADMIN;

    if (!isParty && !isAdmin) {
      throw new EscrowUnauthorizedException();
    }

    return dispute;
  }

  /**
   * Retrieves paginated disputes involving the authenticated user (either opened by or against).
   */
  @Query(() => DisputesPage, { name: 'myDisputes' })
  async getMyDisputes(
    @CurrentUser() currentUser: JwtPayload,
    @Args('input', { nullable: true }) input?: PaginationInput,
    @Args('filter', { nullable: true }) filter?: DisputeFilterInput,
  ): Promise<DisputesPage> {
    return this.disputesService.getMyDisputes(currentUser.sub, input, filter);
  }

  /**
   * Admin: Retrieves all disputes across the platform paginated with filters.
   */
  @Roles(UserRole.ADMIN)
  @Query(() => DisputesPage, { name: 'allDisputes' })
  async getAllDisputes(
    @Args('input', { nullable: true }) input?: PaginationInput,
    @Args('filter', { nullable: true }) filter?: DisputeFilterInput,
  ): Promise<DisputesPage> {
    return this.disputesService.getAllDisputes(input, filter);
  }

  // ─── Mutations ────────────────────────────────────────────────────────────

  /**
   * Opens a dispute for an escrow hold within the 7-day inspection window.
   */
  @Mutation(() => Dispute, { name: 'openDispute' })
  async openDispute(
    @CurrentUser() currentUser: JwtPayload,
    @Args('input') input: CreateDisputeInput,
  ): Promise<Dispute> {
    return this.disputesService.openDispute(currentUser.sub, input);
  }

  /**
   * Allows the user who opened the dispute to cancel it before admin resolution.
   */
  @Mutation(() => Dispute, { name: 'cancelDispute' })
  async cancelDispute(
    @CurrentUser() currentUser: JwtPayload,
    @Args('disputeId', { type: () => ID }) disputeId: string,
  ): Promise<Dispute> {
    return this.disputesService.cancelDispute(currentUser.sub, disputeId);
  }

  /**
   * Admin updates dispute status to UNDER_REVIEW.
   */
  @Roles(UserRole.ADMIN)
  @Mutation(() => Dispute, { name: 'updateDisputeStatus' })
  async updateDisputeStatus(
    @Args('input') input: UpdateDisputeStatusInput,
  ): Promise<Dispute> {
    return this.disputesService.updateDisputeStatus(input);
  }

  /**
   * Admin resolves the dispute (Refund Buyer OR Pay Seller).
   */
  @Roles(UserRole.ADMIN)
  @Mutation(() => Dispute, { name: 'resolveDispute' })
  async resolveDispute(
    @CurrentUser() currentUser: JwtPayload,
    @Args('input') input: ResolveDisputeInput,
  ): Promise<Dispute> {
    return this.disputesService.resolveDispute(currentUser.sub, input);
  }
}
