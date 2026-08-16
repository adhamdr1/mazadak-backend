import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientSession, Types } from 'mongoose';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import Decimal from 'decimal.js';
import { RELEASE_LOCK_LUA_SCRIPT } from '../../infrastructure/redis/redis.constants';
import { SetAutoBidInput } from '../dto/set-auto-bid.input';
import { CancelAutoBidInput } from '../dto/cancel-auto-bid.input';
import { AutoBid } from '../entities/auto-bid.entity';
import { AutoBidStatus } from '../enums/auto-bid-status.enum';
import { BidStatus } from '../enums/bid-status.enum';
import type { IAutoBidRepository } from '../interfaces/auto-bid-repository.interface';
import type { IBidRepository } from '../interfaces/bid-repository.interface';
import type { IAuctionRepository } from '../../auctions/interfaces/auction-repository.interface';
import { WalletService } from '../../wallet/wallet.service';
import { RealtimeService } from '../../infrastructure/pubsub/realtime.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import { RabbitMQEvent } from '../../infrastructure/rabbitmq/rabbitmq-event.types';
import { ProxyBiddingEngineService } from './proxy-bidding-engine.service';
import { AuctionStatus } from '../../auctions/enums/auction-status.enum';
import { AuctionNotFoundException } from '../../auctions/exceptions/auction-not-found.exception';
import { AuctionNotActiveException } from '../exceptions/auction-not-active.exception';
import { AutoBidOnOwnAuctionException } from '../exceptions/auto-bid-on-own-auction.exception';
import { AutoBidMaxTooLowException } from '../exceptions/auto-bid-max-too-low.exception';
import { AutoBidDuplicateMaxException } from '../exceptions/auto-bid-duplicate-max.exception';
import { AutoBidInsufficientBalanceException } from '../exceptions/auto-bid-insufficient-balance.exception';
import { AutoBidNotFoundException } from '../exceptions/auto-bid-not-found.exception';
import { BiddingBusyException } from '../exceptions/bidding-busy.exception';
import { AutoBidsPage } from '../dto/auto-bids-page.type';

const ACTIVE_AUCTIONS_PATTERN = 'auction:active:*';

@Injectable()
export class AutoBiddingService {
  private readonly logger = new Logger(AutoBiddingService.name);

  constructor(
    @Inject('IAutoBidRepository')
    private readonly autoBidRepository: IAutoBidRepository,
    @Inject('IBidRepository')
    private readonly bidRepository: IBidRepository,
    @Inject('IAuctionRepository')
    private readonly auctionRepository: IAuctionRepository,
    private readonly proxyEngine: ProxyBiddingEngineService,
    private readonly walletService: WalletService,
    private readonly realtimeService: RealtimeService,
    private readonly redisService: RedisService,
    private readonly outboxService: OutboxService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async setAutoBid(userId: string, input: SetAutoBidInput): Promise<AutoBid> {
    let acquiredLock = false;
    const lockKey = `auction:bid:lock:${input.auctionId}`;
    const lockValue = randomUUID();

    try {
      const lockResult = await this.redis
        .set(lockKey, lockValue, 'EX', 5, 'NX')
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Redis setAutoBid lock error: ${msg}`);
          return null;
        });

      if (!lockResult) {
        throw new BiddingBusyException();
      }
      acquiredLock = true;

      const session = await this.bidRepository.startSession();
      session.startTransaction();

      try {
        // 1. Check auction validity
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
          throw new AutoBidOnOwnAuctionException();
        }

        const currentWinner = await this.bidRepository.findWinningByAuctionId(
          input.auctionId,
          session,
        );

        const currentPrice = currentWinner
          ? Number(auction.currentPrice.toString())
          : Number(auction.startingPrice.toString());
        const increment = Number(auction.minimumBidIncrement.toString());
        const minimumRequired = currentWinner
          ? new Decimal(currentPrice).plus(increment).toNumber()
          : Number(auction.startingPrice.toString());

        if (input.maxAmount < minimumRequired) {
          throw new AutoBidMaxTooLowException();
        }

        // 2. FIFO Priority Check: Check if duplicate maxAmount is held by another user
        const existingSameMax =
          await this.autoBidRepository.findActiveByAuctionAndMaxAmount(
            input.auctionId,
            input.maxAmount,
            session,
          );
        if (existingSameMax && existingSameMax.userId.toString() !== userId) {
          throw new AutoBidDuplicateMaxException();
        }

        // 3. Check Wallet Available Balance
        const wallet = await this.walletService.getWalletByUserId(userId);
        const availableBalance = new Decimal(wallet.balance.toString())
          .minus(wallet.heldBalance.toString())
          .toNumber();
        if (availableBalance < input.maxAmount) {
          throw new AutoBidInsufficientBalanceException();
        }

        // 4. Upsert the AutoBid configuration
        const autoBid = await this.autoBidRepository.upsert(
          {
            auctionId: new Types.ObjectId(input.auctionId),
            userId: new Types.ObjectId(userId),
            maxAmount: input.maxAmount,
          },
          session,
        );

        // 5. Run Pure Calculation Engine
        const activeAutoBids =
          await this.autoBidRepository.findActiveByAuctionId(
            input.auctionId,
            session,
          );

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
        );

        // 6. Update Exhausted Auto-Bids & publish exhaustion outbox events
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

        // 7. Apply Bids & Wallet adjustments if price or winner changed
        let newWinningBid = currentWinner;
        let priceChanged = false;

        if (engineResult.bidsToCreate.length > 0) {
          const winningCandidate = engineResult.bidsToCreate.find(
            (b) => b.status === BidStatus.WINNING,
          );

          if (winningCandidate) {
            priceChanged = true;
            let outbidTransactionId: string | undefined;

            // Handle funds for previous winner
            if (currentWinner) {
              const prevWinnerId = currentWinner.bidderId.toString();
              const prevAmount = Number(currentWinner.amount.toString());

              // Release previous winner's held funds
              const { transaction } = await this.walletService.release(
                prevWinnerId,
                prevAmount,
                input.auctionId,
                session,
              );
              outbidTransactionId = transaction._id.toString();

              // Mark previous bid as OUTBID
              await this.bidRepository.updateStatus(
                currentWinner._id.toString(),
                BidStatus.OUTBID,
                session,
              );
            }

            // Hold funds for the new winner
            await this.walletService.hold(
              winningCandidate.bidderId,
              winningCandidate.amount,
              input.auctionId,
              session,
            );

            // Create winning bid
            newWinningBid = await this.bidRepository.create(
              {
                auctionId: new Types.ObjectId(input.auctionId),
                bidderId: new Types.ObjectId(winningCandidate.bidderId),
                amount: winningCandidate.amount,
                status: BidStatus.WINNING,
              },
              session,
            );

            // Update Auction Current Price
            await this.auctionRepository.updateCurrentPrice(
              input.auctionId,
              winningCandidate.amount,
              session,
            );

            // Transactional Outbox Events
            await this.outboxService.saveEvent(
              RabbitMQEvent.BidPlaced,
              {
                bidId: newWinningBid._id.toString(),
                auctionId: input.auctionId,
                auctionTitle: auction.title,
                sellerId: auction.sellerId.toString(),
                bidderId: winningCandidate.bidderId,
                amount: winningCandidate.amount,
                outbidUserId: currentWinner?.bidderId.toString(),
                outbidTransactionId,
              },
              session,
            );

            await this.outboxService.saveEvent(
              RabbitMQEvent.AutoBidPlaced,
              {
                bidId: newWinningBid._id.toString(),
                auctionId: input.auctionId,
                auctionTitle: auction.title,
                bidderId: winningCandidate.bidderId,
                amount: winningCandidate.amount,
                isAutoBid: true,
              },
              session,
            );
          }
        }

        await session.commitTransaction();

        // Invalidate active auctions cache
        void this.redisService.invalidatePattern(ACTIVE_AUCTIONS_PATTERN);

        // Realtime notification
        if (priceChanged && newWinningBid) {
          const publishedBid = newWinningBid;
          this.bidRepository
            .countByAuctionId(input.auctionId)
            .then((bidCount) => {
              void this.realtimeService.publishBidAdded({
                bid: publishedBid,
                currentPrice: Number(publishedBid.amount.toString()),
                leadingBidderId: publishedBid.bidderId.toString(),
                bidCount,
              });
            })
            .catch((err: Error) => {
              this.logger.error(
                `Failed to fetch bid count for publish: ${err.message}`,
              );
            });
        }

        return autoBid;
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        await session.endSession();
      }
    } finally {
      if (acquiredLock) {
        try {
          await this.redis.eval(RELEASE_LOCK_LUA_SCRIPT, 1, lockKey, lockValue);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to release Redis setAutoBid lock: ${msg}`);
        }
      }
    }
  }

  async cancelAutoBid(
    userId: string,
    input: CancelAutoBidInput,
  ): Promise<boolean> {
    const existing = await this.autoBidRepository.findActiveByAuctionAndUser(
      input.auctionId,
      userId,
    );

    if (!existing) {
      throw new AutoBidNotFoundException();
    }

    const cancelled = await this.autoBidRepository.cancel(
      input.auctionId,
      userId,
    );

    return cancelled !== null;
  }

  async getMyAutoBid(
    userId: string,
    auctionId: string,
    session?: ClientSession,
  ): Promise<AutoBid | null> {
    return await this.autoBidRepository.findByAuctionAndUser(
      auctionId,
      userId,
      session,
    );
  }

  async getUserAutoBids(
    userId: string,
    page = 1,
    limit = 10,
    status?: AutoBidStatus,
  ): Promise<AutoBidsPage> {
    const { items, total } = await this.autoBidRepository.findByUserId(
      userId,
      page,
      limit,
      status,
    );
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      totalPages,
      hasNextPage: page < totalPages,
    };
  }
}
