import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
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
import { AuctionNotFoundException } from '../auctions/exceptions/auction-not-found.exception';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';

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
    @InjectConnection() private readonly connection: Connection,
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
      ? auction.currentPrice + auction.minimumBidIncrement
      : auction.startingPrice;

    if (input.amount < minimumRequired) {
      throw new BidAmountTooLowException();
    }

    const session = await this.connection.startSession();
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
      if (currentWinner) {
        await this.walletService.release(
          currentWinner.bidderId.toString(),
          currentWinner.amount,
          input.auctionId,
          session,
        );
        await this.bidRepository.updateStatus(
          currentWinner._id.toString(),
          BidStatus.OUTBID,
          session,
        );
      }

      // 3. Create the new WINNING bid
      const newBid = await this.bidRepository.create(
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

      await session.commitTransaction();

      // 5. Send Outbid email notification to previous winner (Post-commit, non-blocking)
      if (currentWinner) {
        this.notifyOutbidUser(
          currentWinner.bidderId.toString(),
          auction.title,
          input.amount,
          input.auctionId,
        ).catch((err) => {
          this.logger.error(
            `Failed to send outbid notification: ${err instanceof Error ? err.message : String(err)}`,
          );
        });
      }

      return newBid;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  private async notifyOutbidUser(
    previousBidderId: string,
    auctionTitle: string,
    newAmount: number,
    auctionId: string,
  ): Promise<void> {
    const previousBidder = await this.usersService.findById(previousBidderId);
    if (!previousBidder) return;

    const name =
      [previousBidder.firstName, previousBidder.lastName]
        .filter(Boolean)
        .join(' ') || 'User';

    await this.notificationsService.sendOutbidEmail(
      previousBidder.email,
      name,
      auctionTitle,
      newAmount,
      auctionId,
    );
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
      const session = await this.connection.startSession();
      session.startTransaction();

      try {
        const winningBid =
          await this.bidRepository.findWinningByAuctionId(auctionId);

        if (!winningBid) {
          this.logger.log(`Auction ${auctionId} ended with no bids`);
          await session.abortTransaction();
          continue;
        }

        const winnerId = winningBid.bidderId.toString();
        const sellerId = auction.sellerId.toString();

        // 1. Capture the funds from the winner
        await this.walletService.capture(
          winnerId,
          winningBid.amount,
          auctionId,
          session,
        );

        // 2. Deposit the funds to the seller
        await this.walletService.deposit(
          sellerId,
          winningBid.amount,
          auctionId,
          session,
        );

        // 3. Assign the winner to the auction
        await this.auctionRepository.setWinner(auctionId, winnerId);

        await session.commitTransaction();

        // 4. Send AUCTION_WON email notification to winner (Post-commit, non-blocking)
        this.notifyAuctionWinner(
          winnerId,
          auction.title,
          winningBid.amount,
          auctionId,
        ).catch((err) => {
          this.logger.error(
            `Failed to send auction won notification for ${auctionId}: ${err instanceof Error ? err.message : String(err)}`,
          );
        });

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

  private async notifyAuctionWinner(
    winnerId: string,
    auctionTitle: string,
    winningAmount: number,
    auctionId: string,
  ): Promise<void> {
    const winner = await this.usersService.findById(winnerId);
    if (!winner) return;

    const name =
      [winner.firstName, winner.lastName].filter(Boolean).join(' ') || 'User';

    await this.notificationsService.sendAuctionWonEmail(
      winner.email,
      name,
      auctionTitle,
      winningAmount,
      auctionId,
    );
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
