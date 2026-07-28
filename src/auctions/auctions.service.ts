import { Injectable, Inject, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { IAuctionRepository } from './interfaces/auction-repository.interface';
import { Auction } from './entities/auction.entity';
import { AuctionStatus } from './enums/auction-status.enum';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateAuctionInput } from './dto/create-auction.input';
import { UpdateAuctionInput } from './dto/update-auction.input';
import { AuctionsFilterInput } from './dto/auctions-filter.input';
import { AuctionsPage } from './dto/auctions-page.type';
import { PaginationInput } from '../common/dto/pagination.input';
import { AuctionNotFoundException } from './exceptions/auction-not-found.exception';
import { AuctionInvalidStateException } from './exceptions/auction-invalid-state.exception';
import { AuctionForbiddenException } from './exceptions/auction-forbidden.exception';
import { AuctionStartTimeTooSoonException } from './exceptions/auction-start-time-too-soon.exception';
import { AuctionEndTimeInvalidException } from './exceptions/auction-end-time-invalid.exception';
import { AuctionNotPendingException } from './exceptions/auction-not-pending.exception';
import { UploadService } from '../upload/upload.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { WalletService } from '../wallet/wallet.service';
import { InAppNotificationType } from '../notifications/in-app/enums/in-app-notification-type.enum';
import { NotificationReferenceType } from '../notifications/in-app/enums/notification-reference-type.enum';
import { RealtimeService } from '../infrastructure/pubsub/realtime.service';

export const AUCTION_STATUS_CHANGED = 'AUCTION_STATUS_CHANGED';

const MIN_START_TIME_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class AuctionsService {
  private readonly logger = new Logger(AuctionsService.name);

  constructor(
    @Inject('IAuctionRepository')
    private readonly auctionRepository: IAuctionRepository,
    private readonly uploadService: UploadService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
    private readonly walletService: WalletService,
    private readonly realtimeService: RealtimeService,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private validateTimes(startTime: Date, endTime: Date): void {
    const now = Date.now();
    if (startTime.getTime() - now < MIN_START_TIME_MS) {
      throw new AuctionStartTimeTooSoonException();
    }
    if (endTime <= startTime) {
      throw new AuctionEndTimeInvalidException();
    }
  }

  private async getAuctionOrThrow(id: string): Promise<Auction> {
    const auction = await this.auctionRepository.findById(id);
    if (!auction) throw new AuctionNotFoundException();
    return auction;
  }

  private assertOwner(auction: Auction, userId: string): void {
    if (auction.sellerId.toString() !== userId) {
      throw new AuctionForbiddenException();
    }
  }

  private assertPending(auction: Auction): void {
    if (auction.status !== AuctionStatus.PENDING) {
      throw new AuctionNotPendingException();
    }
  }

  private buildPage(
    items: Auction[],
    total: number,
    pagination: PaginationInput,
  ): AuctionsPage {
    return {
      items,
      total,
      totalPages: Math.ceil(total / pagination.limit),
      hasNextPage: pagination.page * pagination.limit < total,
    };
  }

  // ─── User-Facing ─────────────────────────────────────────────────────────────

  async createAuction(
    sellerId: string,
    input: CreateAuctionInput,
  ): Promise<Auction> {
    this.validateTimes(input.startTime, input.endTime);

    return this.auctionRepository.create({
      sellerId: new Types.ObjectId(sellerId),
      title: input.title,
      description: input.description,
      category: input.category,
      startingPrice: input.startingPrice,
      minimumBidIncrement: input.minimumBidIncrement,
      images: input.images,
      startTime: input.startTime,
      endTime: input.endTime,
    });
  }

  async findAuctions(
    input: PaginationInput,
    filter: AuctionsFilterInput,
  ): Promise<AuctionsPage> {
    const { items, total } = await this.auctionRepository.findAll(
      input.page,
      input.limit,
      filter,
      [AuctionStatus.CANCELLED],
    );
    return this.buildPage(items, total, input);
  }

  async findAllForAdmin(
    input: PaginationInput,
    filter: AuctionsFilterInput,
  ): Promise<AuctionsPage> {
    const { items, total } = await this.auctionRepository.findAll(
      input.page,
      input.limit,
      filter,
    );
    return this.buildPage(items, total, input);
  }

  async findAuction(id: string): Promise<Auction> {
    return this.getAuctionOrThrow(id);
  }

  async findMyAuctions(
    sellerId: string,
    input: PaginationInput,
    filter: AuctionsFilterInput,
  ): Promise<AuctionsPage> {
    const { items, total } = await this.auctionRepository.findBySellerId(
      sellerId,
      input.page,
      input.limit,
      filter,
    );
    return this.buildPage(items, total, input);
  }

  async findWonAuctions(
    winnerId: string,
    input: PaginationInput,
    filter: AuctionsFilterInput,
  ): Promise<AuctionsPage> {
    const { items, total } = await this.auctionRepository.findByWinnerId(
      winnerId,
      input.page,
      input.limit,
      filter,
    );
    return this.buildPage(items, total, input);
  }

  async updateAuction(
    auctionId: string,
    sellerId: string,
    input: UpdateAuctionInput,
  ): Promise<Auction> {
    const auction = await this.getAuctionOrThrow(auctionId);
    this.assertOwner(auction, sellerId);
    this.assertPending(auction);

    if (input.startTime || input.endTime) {
      const newStart = input.startTime ?? auction.startTime;
      const newEnd = input.endTime ?? auction.endTime;
      this.validateTimes(newStart, newEnd);
    }

    // Determine which images were deleted
    let deletedImages: string[] = [];
    if (input.images) {
      const newImages = input.images;
      deletedImages = auction.images.filter((img) => !newImages.includes(img));
    }

    // 1. Update Database First
    const updated = await this.auctionRepository.update(auctionId, input);
    if (!updated) throw new AuctionNotFoundException();

    // 2. If DB update succeeds, clean up deleted images from Cloudinary (Fire & Forget)
    if (deletedImages.length > 0) {
      Promise.allSettled(
        deletedImages.map((url) =>
          this.uploadService.deleteImage(sellerId, url),
        ),
      ).catch((err) =>
        this.logger.error(
          `Failed to clean up images for auction ${auctionId}`,
          err,
        ),
      );
    }

    return updated;
  }

  async cancelAuction(
    auctionId: string,
    userId: string,
    role: UserRole,
  ): Promise<boolean> {
    const auction = await this.getAuctionOrThrow(auctionId);

    const isOwner = auction.sellerId.toString() === userId;
    const isAdmin = role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) throw new AuctionForbiddenException();

    if (
      auction.status !== AuctionStatus.PENDING &&
      auction.status !== AuctionStatus.ACTIVE
    ) {
      throw new AuctionInvalidStateException();
    }

    const session = await this.auctionRepository.startSession();
    session.startTransaction();

    try {
      // 1. If auction was active, look for highest winning bid to release funds and notify them
      if (auction.status === AuctionStatus.ACTIVE) {
        const winningBid =
          await this.auctionRepository.findWinningBidByAuctionId(
            auctionId,
            session,
          );

        if (winningBid) {
          const bidderId = winningBid.bidderId;

          // Release the held funds within the transaction
          await this.walletService.release(
            bidderId,
            winningBid.amount,
            auctionId,
            session,
          );

          // Send in-app notification to the bidder (transactional)
          this.notificationsService
            .createInAppNotification(
              {
                userId: bidderId,
                type: InAppNotificationType.AUCTION_CANCELLED,
                title: 'Auction Cancelled ❌',
                body: `The auction "${auction.title}" has been cancelled and your held funds of ${winningBid.amount} EGP have been released.`,
                referenceId: auctionId,
                referenceType: NotificationReferenceType.AUCTION,
              },
              session,
            )
            .catch((err) => {
              this.logger.error(
                `Failed to send auction cancelled in-app notification to bidder ${bidderId}: ${err instanceof Error ? err.message : String(err)}`,
              );
            });
        }
      }

      // 2. Update auction status within the transaction
      await this.auctionRepository.updateStatus(
        auctionId,
        AuctionStatus.CANCELLED,
        session,
      );

      await session.commitTransaction();

      // Publish real-time status change (post-commit, fire-and-forget)
      void this.realtimeService.publishAuctionStatusChanged({
        auction: { ...auction, status: AuctionStatus.CANCELLED },
      });

      return true;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(
        `Transaction aborted during cancelAuction for ${auctionId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    } finally {
      await session.endSession();
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async activatePendingAuctions(): Promise<void> {
    const auctions = await this.auctionRepository.findPendingToActivate();
    if (!auctions.length) return;

    const ids = auctions.map((a) => a._id);
    await this.auctionRepository.updateManyStatus(ids, AuctionStatus.ACTIVE);
    this.logger.log(`Activated ${ids.length} auction(s)`);

    for (const auction of auctions) {
      // Notify seller via email/in-app
      this.notifySellerAuctionStarted(auction).catch((err) => {
        this.logger.error(
          `Failed to send auction started email for ${auction._id.toString()}: ${err instanceof Error ? err.message : String(err)}`,
        );
      });

      // Publish real-time status change (non-blocking)
      void this.realtimeService.publishAuctionStatusChanged({
        auction: { ...auction, status: AuctionStatus.ACTIVE },
      });
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async endActiveAuctions(): Promise<void> {
    const auctions = await this.auctionRepository.findActiveToEnd();
    if (!auctions.length) return;

    const ids = auctions.map((a) => a._id);
    await this.auctionRepository.updateManyStatus(ids, AuctionStatus.ENDED);
    this.logger.log(`Ended ${ids.length} auction(s)`);

    // Publish real-time status change for each ended auction (non-blocking)
    for (const auction of auctions) {
      void this.realtimeService.publishAuctionStatusChanged({
        auction: { ...auction, status: AuctionStatus.ENDED },
      });
    }
    // Note: Emails are handled by bids.service.ts (finalizeEndedAuctions)
  }

  private async notifySellerAuctionStarted(auction: Auction): Promise<void> {
    const seller = await this.usersService.findById(
      auction.sellerId.toString(),
    );
    if (!seller) return;

    const name =
      [seller.firstName, seller.lastName].filter(Boolean).join(' ') || 'User';

    await this.notificationsService.sendAuctionStartedSellerEmail(
      seller.email,
      name,
      auction.title,
      auction._id.toString(),
    );

    await this.notificationsService.createInAppNotification({
      userId: auction.sellerId.toString(),
      type: InAppNotificationType.AUCTION_STARTED,
      title: 'Your auction is now LIVE! 🚀',
      body: `Your auction "${auction.title}" is now live and accepting bids.`,
      referenceId: auction._id.toString(),
      referenceType: NotificationReferenceType.AUCTION,
    });
  }
}
