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

@Injectable()
export class MongoAuctionRepository implements IAuctionRepository {
  constructor(
    @InjectModel(Auction.name)
    private readonly auctionModel: Model<AuctionDocument>,
  ) {}

  async create(data: CreateAuctionData): Promise<Auction> {
    const auction = new this.auctionModel({
      ...data,
      currentPrice: data.startingPrice,
    });
    return await auction.save();
  }

  async findById(id: string): Promise<Auction | null> {
    return await this.auctionModel.findById(new Types.ObjectId(id)).exec();
  }

  async findAll(
    page: number,
    limit: number,
    filter: AuctionsFilter,
    excludeStatuses?: AuctionStatus[],
  ): Promise<{ items: Auction[]; total: number }> {
    const query = this.buildQuery(filter, excludeStatuses);
    return this.executePaginatedQuery(query, page, limit);
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
    return this.executePaginatedQuery(query, page, limit);
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
    return this.executePaginatedQuery(query, page, limit);
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

  async updateStatus(id: string, status: AuctionStatus): Promise<void> {
    await this.auctionModel
      .findByIdAndUpdate(new Types.ObjectId(id), { $set: { status } })
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
      query.title = { $regex: filter.search, $options: 'i' };
    }

    return query;
  }

  private async executePaginatedQuery(
    query: Record<string, unknown>,
    page: number,
    limit: number,
  ): Promise<{ items: Auction[]; total: number }> {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.auctionModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.auctionModel.countDocuments(query).exec(),
    ]);

    return { items, total };
  }
}
