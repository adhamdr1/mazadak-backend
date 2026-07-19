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
import { AuctionNotFoundException } from './exceptions/auction-not-found.exception';
import { AuctionInvalidStateException } from './exceptions/auction-invalid-state.exception';
import { AuctionForbiddenException } from './exceptions/auction-forbidden.exception';
import { AuctionStartTimeTooSoonException } from './exceptions/auction-start-time-too-soon.exception';
import { AuctionEndTimeInvalidException } from './exceptions/auction-end-time-invalid.exception';
import { AuctionNotPendingException } from './exceptions/auction-not-pending.exception';

const MIN_START_TIME_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class AuctionsService {
  private readonly logger = new Logger(AuctionsService.name);

  constructor(
    @Inject('IAuctionRepository')
    private readonly auctionRepository: IAuctionRepository,
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
    filter: AuctionsFilterInput,
  ): AuctionsPage {
    return {
      items,
      total,
      totalPages: Math.ceil(total / filter.limit),
      hasNextPage: filter.page * filter.limit < total,
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

  async findAuctions(filter: AuctionsFilterInput): Promise<AuctionsPage> {
    const { items, total } = await this.auctionRepository.findAll(filter);
    return this.buildPage(items, total, filter);
  }

  async findAuction(id: string): Promise<Auction> {
    return this.getAuctionOrThrow(id);
  }

  async findMyAuctions(
    sellerId: string,
    filter: AuctionsFilterInput,
  ): Promise<AuctionsPage> {
    const { items, total } = await this.auctionRepository.findBySellerId(
      sellerId,
      filter,
    );
    return this.buildPage(items, total, filter);
  }

  async findWonAuctions(
    winnerId: string,
    filter: AuctionsFilterInput,
  ): Promise<AuctionsPage> {
    const { items, total } = await this.auctionRepository.findByWinnerId(
      winnerId,
      filter,
    );
    return this.buildPage(items, total, filter);
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

    const updated = await this.auctionRepository.update(auctionId, input);
    if (!updated) throw new AuctionNotFoundException();
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

    await this.auctionRepository.updateStatus(
      auctionId,
      AuctionStatus.CANCELLED,
    );

    return true;
  }

  // ─── Cron Jobs ───────────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_MINUTE)
  async activatePendingAuctions(): Promise<void> {
    const auctions = await this.auctionRepository.findPendingToActivate();
    if (!auctions.length) return;

    const ids = auctions.map((a) => a._id);
    await this.auctionRepository.updateManyStatus(ids, AuctionStatus.ACTIVE);
    this.logger.log(`Activated ${ids.length} auction(s)`);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async endActiveAuctions(): Promise<void> {
    const auctions = await this.auctionRepository.findActiveToEnd();
    if (!auctions.length) return;

    const ids = auctions.map((a) => a._id);
    await this.auctionRepository.updateManyStatus(ids, AuctionStatus.ENDED);
    this.logger.log(`Ended ${ids.length} auction(s)`);
  }
}
