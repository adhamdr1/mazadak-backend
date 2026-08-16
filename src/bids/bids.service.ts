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
import { AutoBidStatus } from './enums/auto-bid-status.enum';
import type { IBidRepository } from './interfaces/bid-repository.interface';
import type { IAutoBidRepository } from './interfaces/auto-bid-repository.interface';
import type { IAuctionRepository } from '../auctions/interfaces/auction-repository.interface';
import { WalletService } from '../wallet/wallet.service';
import { AuctionStatus } from '../auctions/enums/auction-status.enum';
import { AlreadyHighestBidderException } from './exceptions/already-highest-bidder.exception';
import { AuctionNotActiveException } from './exceptions/auction-not-active.exception';
import { BidAmountTooLowException } from './exceptions/bid-amount-too-low.exception';
import { BidOnOwnAuctionException } from './exceptions/bid-on-own-auction.exception';
import { InvalidAuctionIdException } from './exceptions/invalid-auction-id.exception';
import { AuctionNotFoundException } from '../auctions/exceptions/auction-not-found.exception';
import { BiddingBusyException } from './exceptions/bidding-busy.exception';
import { RealtimeService } from '../infrastructure/pubsub/realtime.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import { OutboxService } from '../infrastructure/outbox/outbox.service';
import { RabbitMQEvent } from '../infrastructure/rabbitmq/rabbitmq-event.types';
import { ProxyBiddingEngineService } from './services/proxy-bidding-engine.service';
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
    @Inject('IAutoBidRepository')
    private readonly autoBidRepository: IAutoBidRepository,
    @Inject('IAuctionRepository')
    private readonly auctionRepository: IAuctionRepository,
    private readonly proxyEngine: ProxyBiddingEngineService,
    private readonly walletService: WalletService,
    private readonly realtimeService: RealtimeService,
    private readonly redisService: RedisService,
    private readonly outboxService: OutboxService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async placeBid(userId: string, input: PlaceBidInput): Promise<Bid> {
    let acquiredLock = false;
    const lockKey = `auction:bid:lock:${input.auctionId}`;
    const lockValue = randomUUID();

    try {
      const lockResult = await this.redis
        .set(lockKey, lockValue, 'EX', 5, 'NX')
        .catch((err) => {
          this.logger.warn(
            `Redis placeBid lock error: ${err instanceof Error ? err.message : String(err)}`,
          );
          return null;
        });

      if (!lockResult) {
        throw new BiddingBusyException();
      }
      acquiredLock = true;

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

        const currentPrice = currentWinner
          ? Number(auction.currentPrice.toString())
          : Number(auction.startingPrice.toString());
        const increment = Number(auction.minimumBidIncrement.toString());
        const minimumRequired = currentWinner
          ? new Decimal(currentPrice).plus(increment).toNumber()
          : Number(auction.startingPrice.toString());

        if (input.amount < minimumRequired) {
          throw new BidAmountTooLowException();
        }

        // Fetch active auto-bids for this auction
        const activeAutoBids =
          await this.autoBidRepository.findActiveByAuctionId(
            input.auctionId,
            session,
          );

        // Run proxy engine evaluation
        const engineResult = this.proxyEngine.calculateNextState(
          {
            startPrice: Number(auction.startingPrice.toString()),
            currentPrice,
            minimumBidIncrement: increment,
            hasExistingBids: !!currentWinner,
            currentWinnerId: currentWinner?.bidderId.toString(),
          },
          activeAutoBids.map((ab) => ({
            id: ab._id.toString(),
            userId: ab.userId.toString(),
            maxAmount: Number(ab.maxAmount.toString()),
            createdAt: ab.createdAt,
          })),
          { bidderId: userId, amount: input.amount },
        );

        // Update exhausted auto-bids
        for (const exhaustedId of engineResult.exhaustedAutoBidIds) {
          await this.autoBidRepository.updateStatus(
            exhaustedId,
            AutoBidStatus.EXHAUSTED,
            session,
          );

          const exhaustedAutoBid = activeAutoBids.find(
            (ab) => ab._id.toString() === exhaustedId,
          );
          if (
            exhaustedAutoBid &&
            exhaustedAutoBid.userId.toString() !== engineResult.winningBidderId
          ) {
            await this.outboxService.saveEvent(
              RabbitMQEvent.AutoBidExhausted,
              {
                autoBidId: exhaustedId,
                auctionId: input.auctionId,
                auctionTitle: auction.title,
                userId: exhaustedAutoBid.userId.toString(),
                maxAmount: Number(exhaustedAutoBid.maxAmount.toString()),
                currentPrice: engineResult.winningAmount,
              },
              session,
            );
          }
        }

        let userBid: Bid;
        let finalWinningBid: Bid;
        let outbidTransactionId: string | undefined;

        if (engineResult.winningBidderId === userId) {
          // Manual bidder wins!
          // 1. Hold manual bidder's funds
          await this.walletService.hold(
            userId,
            input.amount,
            input.auctionId,
            session,
          );

          // 2. Release previous winner's funds and mark OUTBID
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

          // 3. Record winning bid
          userBid = await this.bidRepository.create(
            {
              auctionId: new Types.ObjectId(input.auctionId),
              bidderId: new Types.ObjectId(userId),
              amount: input.amount,
              status: BidStatus.WINNING,
            },
            session,
          );
          finalWinningBid = userBid;

          // 4. Update the auction's current price
          await this.auctionRepository.updateCurrentPrice(
            input.auctionId,
            input.amount,
            session,
          );

          // 5. Outbox Event
          await this.outboxService.saveEvent(
            RabbitMQEvent.BidPlaced,
            {
              bidId: userBid._id.toString(),
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
        } else {
          // An Auto-Bid beat or tied the manual bidder!
          // 1. Record the manual bid as OUTBID (NO wallet hold since they lost atomically)
          userBid = await this.bidRepository.create(
            {
              auctionId: new Types.ObjectId(input.auctionId),
              bidderId: new Types.ObjectId(userId),
              amount: input.amount,
              status: BidStatus.OUTBID,
            },
            session,
          );

          // 2. Handle funds for previous winner (if different from the auto-bid winner)
          if (
            currentWinner &&
            currentWinner.bidderId.toString() !== engineResult.winningBidderId
          ) {
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
          } else if (
            currentWinner &&
            currentWinner.bidderId.toString() === engineResult.winningBidderId
          ) {
            // Winning auto-bidder was already winning at a lower price -> release previous hold
            await this.walletService.release(
              currentWinner.bidderId.toString(),
              Number(currentWinner.amount.toString()),
              input.auctionId,
              session,
            );
            await this.bidRepository.updateStatus(
              currentWinner._id.toString(),
              BidStatus.OUTBID,
              session,
            );
          }

          // 3. Hold funds for winning auto-bidder at the new price
          await this.walletService.hold(
            engineResult.winningBidderId,
            engineResult.winningAmount,
            input.auctionId,
            session,
          );

          // 4. Create the winning auto-bid
          finalWinningBid = await this.bidRepository.create(
            {
              auctionId: new Types.ObjectId(input.auctionId),
              bidderId: new Types.ObjectId(engineResult.winningBidderId),
              amount: engineResult.winningAmount,
              status: BidStatus.WINNING,
            },
            session,
          );

          // 5. Update Auction Current Price
          await this.auctionRepository.updateCurrentPrice(
            input.auctionId,
            engineResult.winningAmount,
            session,
          );

          // 6. Outbox Events
          await this.outboxService.saveEvent(
            RabbitMQEvent.BidPlaced,
            {
              bidId: finalWinningBid._id.toString(),
              auctionId: input.auctionId,
              auctionTitle: auction.title,
              sellerId: auction.sellerId.toString(),
              bidderId: engineResult.winningBidderId,
              amount: engineResult.winningAmount,
              outbidUserId: userId,
              outbidTransactionId,
            },
            session,
          );

          await this.outboxService.saveEvent(
            RabbitMQEvent.AutoBidPlaced,
            {
              bidId: finalWinningBid._id.toString(),
              auctionId: input.auctionId,
              auctionTitle: auction.title,
              bidderId: engineResult.winningBidderId,
              amount: engineResult.winningAmount,
              isAutoBid: true,
            },
            session,
          );
        }

        await session.commitTransaction();

        // Invalidate active auctions cache (currentPrice changed)
        void this.redisService.invalidatePattern(ACTIVE_AUCTIONS_PATTERN);

        // Publish real-time event
        this.bidRepository
          .countByAuctionId(input.auctionId)
          .then((bidCount) => {
            void this.realtimeService.publishBidAdded({
              bid: finalWinningBid,
              currentPrice: Number(finalWinningBid.amount.toString()),
              leadingBidderId: finalWinningBid.bidderId.toString(),
              bidCount,
            });
          })
          .catch((err: Error) => {
            this.logger.error(
              `Failed to fetch bid count for publish: ${err.message}`,
            );
          });

        return userBid;
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        await session.endSession();
      }
    } finally {
      if (acquiredLock) {
        await this.redis
          .eval(RELEASE_LOCK_LUA_SCRIPT, 1, lockKey, lockValue)
          .catch(() => undefined);
      }
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

            // Deactivate all active auto-bids for this auction
            await this.autoBidRepository.deactivateAllForAuction(
              auctionId,
              AutoBidStatus.EXHAUSTED,
              session,
            );

            // Send Outbox Event
            await this.outboxService.saveEvent(
              RabbitMQEvent.AuctionEnded,
              {
                auctionId,
                auctionTitle: auction.title ?? '',
                sellerId: auction.sellerId.toString(),
                finalPrice: Number((auction.currentPrice ?? 0).toString()),
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

          // 4. Deactivate all active auto-bids for this auction
          await this.autoBidRepository.deactivateAllForAuction(
            auctionId,
            AutoBidStatus.EXHAUSTED,
            session,
          );

          // Send Outbox Event
          await this.outboxService.saveEvent(
            RabbitMQEvent.AuctionEnded,
            {
              auctionId,
              auctionTitle: auction.title ?? '',
              sellerId,
              finalPrice: Number(
                (auction.currentPrice ?? winningBid.amount).toString(),
              ),
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
