import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import {
  IAuctionRepository,
  AuctionsFilter,
  CreateAuctionData,
  UpdateAuctionData,
} from '../interfaces/auction-repository.interface';
import { Auction, AuctionDocument } from '../entities/auction.entity';
import { AuctionStatus } from '../enums/auction-status.enum';
import { Bid, BidDocument } from '../../bids/entities/bid.entity';
import { BidStatus } from '../../bids/enums/bid-status.enum';

@Injectable()
export class MongoAuctionRepository implements IAuctionRepository {
  constructor(
    @InjectModel(Auction.name)
    private readonly auctionModel: Model<AuctionDocument>,
    @InjectModel(Bid.name)
    private readonly bidModel: Model<BidDocument>,
  ) {}

  async startSession(): Promise<ClientSession> {
    return this.auctionModel.db.startSession();
  }

  async create(data: CreateAuctionData): Promise<Auction> {
    const auction = new this.auctionModel({
      ...data,
      currentPrice: data.startingPrice,
    });
    return await auction.save();
  }

  async findById(id: string, session?: ClientSession): Promise<Auction | null> {
    return await this.auctionModel
      .findById(new Types.ObjectId(id))
      .session(session || null)
      .exec();
  }

  async findAll(
    page: number,
    limit: number,
    filter: AuctionsFilter,
    excludeStatuses?: AuctionStatus[],
  ): Promise<{ items: Auction[]; total: number }> {
    const query = this.buildQuery(filter, excludeStatuses);
    const sort = this.buildSort(filter);
    return this.executePaginatedQuery(query, page, limit, sort);
  }

  async findBySellerId(
    sellerId: string,
    page: number,
    limit: number,
    filter: AuctionsFilter,
  ): Promise<{ items: Auction[]; total: number }> {
    const query = {
      ...this.buildQuery(filter),
      sellerId: new Types.ObjectId(sellerId),
    };
    const sort = this.buildSort(filter);
    return this.executePaginatedQuery(query, page, limit, sort);
  }

  async findByWinnerId(
    winnerId: string,
    page: number,
    limit: number,
    filter: AuctionsFilter,
  ): Promise<{ items: Auction[]; total: number }> {
    const query = {
      ...this.buildQuery(filter),
      winnerId: new Types.ObjectId(winnerId),
    };
    const sort = this.buildSort(filter);
    return this.executePaginatedQuery(query, page, limit, sort);
  }

  async update(id: string, data: UpdateAuctionData): Promise<Auction | null> {
    return await this.auctionModel
      .findByIdAndUpdate(
        new Types.ObjectId(id),
        { $set: data },
        { returnDocument: 'after' },
      )
      .exec();
  }

  async updateStatus(
    id: string,
    status: AuctionStatus,
    session?: ClientSession,
    adminActionReason?: string,
  ): Promise<void> {
    const updatePayload: Record<string, any> = { status };
    if (adminActionReason) {
      updatePayload.adminActionReason = adminActionReason;
    }

    await this.auctionModel
      .findByIdAndUpdate(
        new Types.ObjectId(id),
        { $set: updatePayload },
        { session },
      )
      .exec();
  }

  async updateManyStatus(
    ids: Types.ObjectId[],
    status: AuctionStatus,
  ): Promise<void> {
    await this.auctionModel
      .updateMany({ _id: { $in: ids } }, { $set: { status } })
      .exec();
  }

  async findPendingToActivate(): Promise<Auction[]> {
    return await this.auctionModel
      .find({
        status: AuctionStatus.PENDING,
        startTime: { $lte: new Date() },
      })
      .exec();
  }

  async findActiveToEnd(): Promise<Auction[]> {
    return await this.auctionModel
      .find({
        status: AuctionStatus.ACTIVE,
        endTime: { $lte: new Date() },
      })
      .exec();
  }

  async updateCurrentPrice(
    id: string,
    price: number,
    session?: ClientSession,
  ): Promise<void> {
    await this.auctionModel
      .findByIdAndUpdate(
        new Types.ObjectId(id),
        { $set: { currentPrice: price } },
        { session },
      )
      .exec();
  }

  async findEndedWithoutWinner(): Promise<Auction[]> {
    return await this.auctionModel
      .find({
        status: AuctionStatus.ENDED,
        winnerId: null,
        isFinalized: false,
      })
      .exec();
  }

  async finalizeAuction(
    id: string,
    winnerId?: string,
    session?: ClientSession,
  ): Promise<void> {
    const updateQuery: Record<string, unknown> = { isFinalized: true };
    if (winnerId) {
      updateQuery.winnerId = new Types.ObjectId(winnerId);
    }

    await this.auctionModel
      .findByIdAndUpdate(
        new Types.ObjectId(id),
        { $set: updateQuery },
        { session },
      )
      .exec();
  }

  private buildQuery(
    filter: AuctionsFilter,
    excludeStatuses?: AuctionStatus[],
  ) {
    const query: Record<string, unknown> = {};

    if (filter.category) query.category = filter.category;
    if (filter.status) {
      query.status = filter.status;
    } else if (excludeStatuses && excludeStatuses.length > 0) {
      query.status = { $nin: excludeStatuses };
    }

    if (filter.search) {
      query.$text = { $search: filter.search };
    }

    return query;
  }

  private buildSort(filter: AuctionsFilter): Record<string, 1 | -1> {
    const sortParams: Record<string, 1 | -1> = {};
    if (filter.sort) {
      sortParams[filter.sort.field] = filter.sort.order === 'ASC' ? 1 : -1;
    } else {
      sortParams['createdAt'] = -1; // Default
    }

    // If text search is used, we might want to sort by text score, but for now we keep the requested sort or default.
    return sortParams;
  }

  private async executePaginatedQuery(
    query: Record<string, unknown>,
    page: number,
    limit: number,
    sort: Record<string, 1 | -1>,
  ): Promise<{ items: Auction[]; total: number }> {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.auctionModel.find(query).sort(sort).skip(skip).limit(limit).exec(),
      this.auctionModel.countDocuments(query).exec(),
    ]);

    return { items, total };
  }

  async findWinningBidByAuctionId(
    auctionId: string,
    session?: ClientSession,
  ): Promise<{ bidderId: string; amount: number } | null> {
    const winningBid = await this.bidModel
      .findOne(
        {
          auctionId: new Types.ObjectId(auctionId),
          status: BidStatus.WINNING,
        },
        null,
        { session },
      )
      .exec();

    if (!winningBid) return null;

    return {
      bidderId: winningBid.bidderId.toString(),
      amount: winningBid.amount,
    };
  }
}
