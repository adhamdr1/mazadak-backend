import { Inject, Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RELEASE_LOCK_LUA_SCRIPT } from '../infrastructure/redis/redis.constants';
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
import { RealtimeService } from '../infrastructure/pubsub/realtime.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import { OutboxService } from '../infrastructure/outbox/outbox.service';
import { RabbitMQEvent } from '../infrastructure/rabbitmq/rabbitmq-event.types';
import Decimal from 'decimal.js';

const ACTIVE_AUCTIONS_PATTERN = 'auction:active:*';

const FINALIZE_AUCTIONS_LOCK_KEY = 'auction:finalize:lock';
const LOCK_TTL_SECONDS = 30;

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
    private readonly realtimeService: RealtimeService,
    private readonly redisService: RedisService,
    private readonly outboxService: OutboxService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async placeBid(userId: string, input: PlaceBidInput): Promise<Bid> {
    const session = await this.bidRepository.startSession();
    session.startTransaction();

    try {
      const auction = await this.auctionRepository.findById(
        input.auctionId,
        session,
      );
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
        session,
      );

      if (currentWinner && currentWinner.bidderId.toString() === userId) {
        throw new AlreadyHighestBidderException();
      }

      const minimumRequired = currentWinner
        ? new Decimal(auction.currentPrice.toString())
            .plus(auction.minimumBidIncrement.toString())
            .toNumber()
        : Number(auction.startingPrice.toString());

      if (input.amount < minimumRequired) {
        throw new BidAmountTooLowException();
      }

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
          Number(currentWinner.amount.toString()),
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
    let acquiredLock = false;
    const lockValue = randomUUID();
    try {
      const lockResult = await this.redis
        .set(
          FINALIZE_AUCTIONS_LOCK_KEY,
          lockValue,
          'EX',
          LOCK_TTL_SECONDS,
          'NX',
        )
        .catch((err) => {
          this.logger.warn(
            `Redis finalize auctions lock error: ${err instanceof Error ? err.message : String(err)}`,
          );
          return null;
        });

      if (!lockResult) return;
      acquiredLock = true;

      const endedAuctions =
        await this.auctionRepository.findEndedWithoutWinner();

      if (endedAuctions.length === 0) {
        return;
      }

      this.logger.log(
        `Found ${endedAuctions.length} ended auctions to finalize`,
      );

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
                finalPrice: Number(auction.currentPrice.toString()),
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
              Number(winningBid.amount.toString()),
              auctionId,
              session,
            );

          // 2. Deposit the funds to the seller
          const { transaction: depositTransaction } =
            await this.walletService.deposit(
              sellerId,
              Number(winningBid.amount.toString()),
              auctionId,
              session,
            );

          // 3. Assign the winner to the auction and mark as finalized
          await this.auctionRepository.finalizeAuction(
            auctionId,
            winnerId,
            session,
          );

          // Send Outbox Event
          await this.outboxService.saveEvent(
            RabbitMQEvent.AuctionEnded,
            {
              auctionId,
              auctionTitle: auction.title,
              sellerId,
              finalPrice: Number(auction.currentPrice.toString()),
              winnerId,
              captureTransactionId: captureTransaction._id.toString(),
              depositTransactionId: depositTransaction._id.toString(),
            },
            session,
          );

          await session.commitTransaction();

          this.logger.log(
            `Successfully finalized auction ${auctionId}. Winner: ${winnerId}, Seller: ${sellerId}, Amount: ${winningBid.amount.toString()}`,
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
    } catch (err) {
      this.logger.error(
        `Failed to run finalizeEndedAuctions: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      if (acquiredLock) {
        await this.redis
          .eval(
            RELEASE_LOCK_LUA_SCRIPT,
            1,
            FINALIZE_AUCTIONS_LOCK_KEY,
            lockValue,
          )
          .catch(() => undefined);
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
