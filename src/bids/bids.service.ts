import { Inject, Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PlaceBidInput } from './dto/place-bid.input';
import { BidsFilterInput } from './dto/bids-filter.input';
import { BidsPage } from './dto/bids-page.type';
import { PaginationInput } from '../common/dto/pagination.input';
import { Bid } from './entities/bid.entity';
import { BidStatus } from './enums/bid-status.enum';
import type { IBidRepository } from './interfaces/bid-repository.interface';
import type { IAuctionRepository } from '../auctions/interfaces/auction-repository.interface';
import { WalletService } from '../wallet/wallet.service';
import { AuctionStatus } from '../auctions/enums/auction-status.enum';
import { AlreadyHighestBidderException } from './exceptions/already-highest-bidder.exception';
import { AuctionNotActiveException } from './exceptions/auction-not-active.exception';
import { BidAmountTooLowException } from './exceptions/bid-amount-too-low.exception';
import { BidOnOwnAuctionException } from './exceptions/bid-on-own-auction.exception';
import { InvalidAuctionIdException } from './exceptions/invalid-auction-id.exception';
import { AuctionNotFoundException } from '../auctions/exceptions/auction-not-found.exception';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { RealtimeService } from '../infrastructure/pubsub/realtime.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import { OutboxService } from '../infrastructure/outbox/outbox.service';
import { RabbitMQEvent } from '../infrastructure/rabbitmq/rabbitmq-event.types';
import Decimal from 'decimal.js';

const ACTIVE_AUCTIONS_PATTERN = 'auction:active:*';

export const BID_ADDED = 'BID_ADDED';

@Injectable()
export class BidsService {
  private readonly logger = new Logger(BidsService.name);

  constructor(
    @Inject('IBidRepository')
    private readonly bidRepository: IBidRepository,
    @Inject('IAuctionRepository')
    private readonly auctionRepository: IAuctionRepository,
    private readonly walletService: WalletService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
    private readonly realtimeService: RealtimeService,
    private readonly redisService: RedisService,
    private readonly outboxService: OutboxService,
  ) {}

  async placeBid(userId: string, input: PlaceBidInput): Promise<Bid> {
    const auction = await this.auctionRepository.findById(input.auctionId);
    if (!auction) {
      throw new AuctionNotFoundException();
    }

    if (auction.status !== AuctionStatus.ACTIVE) {
      throw new AuctionNotActiveException();
    }

    if (auction.sellerId.toString() === userId) {
      throw new BidOnOwnAuctionException();
    }

    const currentWinner = await this.bidRepository.findWinningByAuctionId(
      input.auctionId,
    );

    if (currentWinner && currentWinner.bidderId.toString() === userId) {
      throw new AlreadyHighestBidderException();
    }

    const minimumRequired = currentWinner
      ? new Decimal(auction.currentPrice)
          .plus(auction.minimumBidIncrement)
          .toNumber()
      : auction.startingPrice;

    if (input.amount < minimumRequired) {
      throw new BidAmountTooLowException();
    }

    const session = await this.bidRepository.startSession();
    session.startTransaction();

    try {
      // 1. Hold new bidder's funds
      await this.walletService.hold(
        userId,
        input.amount,
        input.auctionId,
        session,
      );

      // 2. Release previous winner's funds and mark OUTBID
      let outbidTransactionId: string | undefined;
      if (currentWinner) {
        const { transaction } = await this.walletService.release(
          currentWinner.bidderId.toString(),
          currentWinner.amount,
          input.auctionId,
          session,
        );
        outbidTransactionId = transaction._id.toString();

        await this.bidRepository.updateStatus(
          currentWinner._id.toString(),
          BidStatus.OUTBID,
          session,
        );
      }

      // 3. Record the bid
      const bid = await this.bidRepository.create(
        {
          auctionId: new Types.ObjectId(input.auctionId),
          bidderId: new Types.ObjectId(userId),
          amount: input.amount,
          status: BidStatus.WINNING,
        },
        session,
      );

      // 4. Update the auction's current price
      await this.auctionRepository.updateCurrentPrice(
        input.auctionId,
        input.amount,
        session,
      );

      // 7. Publish Event to Outbox (Transactional)
      await this.outboxService.saveEvent(
        RabbitMQEvent.BidPlaced,
        {
          bidId: bid._id.toString(),
          auctionId: input.auctionId,
          auctionTitle: auction.title,
          sellerId: auction.sellerId.toString(),
          bidderId: userId,
          amount: input.amount,
          outbidUserId: currentWinner?.bidderId.toString(),
          outbidTransactionId,
        },
        session,
      );

      await session.commitTransaction();

      // Invalidate active auctions cache (currentPrice changed)
      void this.redisService.invalidatePattern(ACTIVE_AUCTIONS_PATTERN);

      // 8. Publish real-time event (post-commit, non-blocking)
      // bidCount is fetched after commit to get the accurate total
      this.bidRepository
        .countByAuctionId(input.auctionId)
        .then((bidCount) => {
          void this.realtimeService.publishBidAdded({
            bid,
            currentPrice: input.amount,
            leadingBidderId: userId,
            bidCount,
          });
        })
        .catch((err: Error) => {
          this.logger.error(
            `Failed to fetch bid count for publish: ${err.message}`,
          );
        });

      return bid;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async finalizeEndedAuctions(): Promise<void> {
    const endedAuctions = await this.auctionRepository.findEndedWithoutWinner();

    if (endedAuctions.length === 0) {
      return;
    }

    this.logger.log(`Found ${endedAuctions.length} ended auctions to finalize`);

    for (const auction of endedAuctions) {
      const auctionId = auction._id.toString();
      const session = await this.bidRepository.startSession();
      session.startTransaction();

      try {
        const winningBid = await this.bidRepository.findWinningByAuctionId(
          auctionId,
          session,
        );

        if (!winningBid) {
          this.logger.log(`Auction ${auctionId} ended with no bids`);
          await this.auctionRepository.finalizeAuction(
            auctionId,
            undefined,
            session,
          );

          // Send Outbox Event
          await this.outboxService.saveEvent(
            RabbitMQEvent.AuctionEnded,
            {
              auctionId,
              auctionTitle: auction.title,
              sellerId: auction.sellerId.toString(),
              finalPrice: auction.currentPrice,
            },
            session,
          );

          await session.commitTransaction();
          continue;
        }

        const winnerId = winningBid.bidderId.toString();
        const sellerId = auction.sellerId.toString();

        // 1. Capture the funds from the winner
        const { transaction: captureTransaction } =
          await this.walletService.capture(
            winnerId,
            winningBid.amount,
            auctionId,
            session,
          );

        // 2. Deposit the funds to the seller
        const { transaction: depositTransaction } =
          await this.walletService.deposit(
            sellerId,
            winningBid.amount,
            auctionId,
            session,
          );

        // 3. Assign the winner to the auction and mark as finalized
        await this.auctionRepository.finalizeAuction(
          auctionId,
          winnerId,
          session,
        );

        // Fetch winner name for seller's notification
        let winnerName: string | null = null;
        try {
          const winnerUser = await this.usersService.findById(winnerId);
          if (winnerUser) {
            winnerName =
              [winnerUser.firstName, winnerUser.lastName]
                .filter(Boolean)
                .join(' ') || 'Winning Bidder';
          }
        } catch {
          winnerName = 'Winning Bidder';
        }

        // Send Outbox Event
        await this.outboxService.saveEvent(
          RabbitMQEvent.AuctionEnded,
          {
            auctionId,
            auctionTitle: auction.title,
            sellerId,
            finalPrice: auction.currentPrice,
            winnerId,
            winnerName: winnerName || undefined,
            captureTransactionId: captureTransaction._id.toString(),
            depositTransactionId: depositTransaction._id.toString(),
          },
          session,
        );

        await session.commitTransaction();

        this.logger.log(
          `Successfully finalized auction ${auctionId}. Winner: ${winnerId}, Seller: ${sellerId}, Amount: ${winningBid.amount}`,
        );
      } catch (error) {
        await session.abortTransaction();
        this.logger.error(
          `Failed to finalize auction ${auctionId}: ${(error as Error).message}`,
        );
      } finally {
        await session.endSession();
      }
    }
  }

  async adminGetAllBids(
    input: PaginationInput,
    filter: BidsFilterInput,
  ): Promise<BidsPage> {
    const { items, total } = await this.bidRepository.findAll(
      input.page,
      input.limit,
      filter,
    );
    const totalPages = Math.ceil(total / input.limit);

    return {
      items,
      total,
      totalPages,
      hasNextPage: input.page < totalPages,
    };
  }

  async getAuctionBids(
    auctionId: string,
    input: PaginationInput,
    filter: BidsFilterInput,
  ): Promise<BidsPage> {
    if (!Types.ObjectId.isValid(auctionId)) {
      throw new InvalidAuctionIdException();
    }
    const { items, total } = await this.bidRepository.findByAuctionId(
      auctionId,
      input.page,
      input.limit,
      filter,
    );
    const totalPages = Math.ceil(total / input.limit);

    return {
      items,
      total,
      totalPages,
      hasNextPage: input.page < totalPages,
    };
  }

  async getMyBids(
    userId: string,
    input: PaginationInput,
    filter: BidsFilterInput,
  ): Promise<BidsPage> {
    const { items, total } = await this.bidRepository.findByBidderId(
      userId,
      input.page,
      input.limit,
      filter,
    );
    const totalPages = Math.ceil(total / input.limit);

    return {
      items,
      total,
      totalPages,
      hasNextPage: input.page < totalPages,
    };
  }
}
