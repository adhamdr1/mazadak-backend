import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ReviewsService } from './reviews.service';
import { Review } from './entities/review.entity';
import { UserRatingStats } from './entities/user-rating-stats.entity';
import { ReviewsPage } from './dto/reviews-page.type';
import { CreateReviewInput } from './dto/create-review.input';
import { ReplyReviewInput } from './dto/reply-review.input';
import { ReviewsFilterInput } from './dto/reviews-filter.input';
import { ReviewsSortInput } from './dto/reviews-sort.input';
import { PaginationInput } from '../common/dto/pagination.input';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PublicProfile } from '../users/dto/public-profile.dto';
import { Auction } from '../auctions/entities/auction.entity';
import { GetUserPublicProfileQuery } from '../users/queries/get-user-public-profile.query';
import { GetAuctionByIdQuery } from '../auctions/queries/get-auction-by-id.query';
import { CanReviewAuctionResponse } from './dto/can-review-auction.response';

@Resolver(() => Review)
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewsResolver {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly queryBus: QueryBus,
  ) {}

  // ─── Field Resolvers ───────────────────────────────────────────────────────

  @Public()
  @ResolveField(() => PublicProfile, { nullable: true })
  async reviewer(@Parent() review: Review): Promise<PublicProfile | null> {
    if (!review.reviewerId) return null;
    return this.queryBus.execute<GetUserPublicProfileQuery, PublicProfile>(
      new GetUserPublicProfileQuery(review.reviewerId.toString()),
    );
  }

  @Public()
  @ResolveField(() => PublicProfile, { nullable: true })
  async reviewedUser(@Parent() review: Review): Promise<PublicProfile | null> {
    if (!review.reviewedUserId) return null;
    return this.queryBus.execute<GetUserPublicProfileQuery, PublicProfile>(
      new GetUserPublicProfileQuery(review.reviewedUserId.toString()),
    );
  }

  @Public()
  @ResolveField(() => Auction, { nullable: true })
  async auction(@Parent() review: Review): Promise<Auction | null> {
    if (!review.auctionId) return null;
    return this.queryBus.execute<GetAuctionByIdQuery, Auction | null>(
      new GetAuctionByIdQuery(review.auctionId.toString()),
    );
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  /**
   * Retrieves paginated published reviews for a given user.
   */
  @Public()
  @Query(() => ReviewsPage, { name: 'userReviews' })
  async getUserReviews(
    @Args('userId', { type: () => ID }) userId: string,
    @Args('input', { nullable: true }) input?: PaginationInput,
    @Args('filter', { nullable: true }) filter?: ReviewsFilterInput,
    @Args('sort', { nullable: true }) sort?: ReviewsSortInput,
  ): Promise<ReviewsPage> {
    const page = input?.page ?? 1;
    const limit = input?.limit ?? 10;
    return this.reviewsService.getReviewsForUser(
      userId,
      filter,
      sort,
      page,
      limit,
    );
  }

  /**
   * Retrieves paginated reviews written by the currently authenticated user.
   */
  @Query(() => ReviewsPage, { name: 'myWrittenReviews' })
  async getMyWrittenReviews(
    @CurrentUser() currentUser: JwtPayload,
    @Args('input', { nullable: true }) input?: PaginationInput,
  ): Promise<ReviewsPage> {
    const page = input?.page ?? 1;
    const limit = input?.limit ?? 10;
    return this.reviewsService.getReviewsByReviewer(
      currentUser.sub,
      page,
      limit,
    );
  }

  /**
   * Retrieves aggregated rating statistics for a given user.
   */
  @Public()
  @Query(() => UserRatingStats, { name: 'userRatingStats' })
  async getUserRatingStats(
    @Args('userId', { type: () => ID }) userId: string,
  ): Promise<UserRatingStats> {
    return this.reviewsService.getUserRatingStats(userId);
  }

  /**
   * Checks whether the current user is eligible to review an auction.
   */
  @Query(() => CanReviewAuctionResponse, { name: 'canReviewAuction' })
  async canReviewAuction(
    @CurrentUser() currentUser: JwtPayload,
    @Args('auctionId', { type: () => ID }) auctionId: string,
  ): Promise<CanReviewAuctionResponse> {
    return this.reviewsService.canUserReviewAuction(currentUser.sub, auctionId);
  }

  /**
   * Retrieves a single review by its ID.
   */
  @Public()
  @Query(() => Review, { name: 'review' })
  async getReview(@Args('id', { type: () => ID }) id: string): Promise<Review> {
    return this.reviewsService.getReviewById(id);
  }

  /**
   * Admin query: Retrieves all reviews for an auction (including PENDING and HIDDEN).
   */
  @Roles(UserRole.ADMIN)
  @Query(() => [Review], { name: 'adminAuctionReviews' })
  async getAdminAuctionReviews(
    @Args('auctionId', { type: () => ID }) auctionId: string,
  ): Promise<Review[]> {
    return this.reviewsService.getAdminAuctionReviews(auctionId);
  }

  // ─── Mutations ────────────────────────────────────────────────────────────

  /**
   * Submits a review for an auction counterparty.
   */
  @Mutation(() => Review, { name: 'createReview' })
  async createReview(
    @CurrentUser() currentUser: JwtPayload,
    @Args('input') input: CreateReviewInput,
  ): Promise<Review> {
    return this.reviewsService.createReview(currentUser.sub, input);
  }

  /**
   * Submits a public reply to a published review received by the current user.
   */
  @Mutation(() => Review, { name: 'replyToReview' })
  async replyToReview(
    @CurrentUser() currentUser: JwtPayload,
    @Args('input') input: ReplyReviewInput,
  ): Promise<Review> {
    return this.reviewsService.replyToReview(currentUser.sub, input);
  }

  /**
   * Admin mutation: Hides a review from public view (moderation / soft delete).
   */
  @Roles(UserRole.ADMIN)
  @Mutation(() => Review, { name: 'hideReview' })
  async hideReview(
    @Args('reviewId', { type: () => ID }) reviewId: string,
  ): Promise<Review> {
    return this.reviewsService.hideReview(reviewId);
  }

  /**
   * Admin mutation: Restores a hidden review to published status.
   */
  @Roles(UserRole.ADMIN)
  @Mutation(() => Review, { name: 'unhideReview' })
  async unhideReview(
    @Args('reviewId', { type: () => ID }) reviewId: string,
  ): Promise<Review> {
    return this.reviewsService.unhideReview(reviewId);
  }
}
