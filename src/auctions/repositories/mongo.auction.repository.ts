import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
    filter: AuctionsFilter,
  ): Promise<{ items: Auction[]; total: number }> {
    const query = this.buildQuery(filter);
    return this.executePaginatedQuery(query, filter);
  }

  async findBySellerId(
    sellerId: string,
    filter: AuctionsFilter,
  ): Promise<{ items: Auction[]; total: number }> {
    const query = {
      ...this.buildQuery(filter),
      sellerId: new Types.ObjectId(sellerId),
    };
    return this.executePaginatedQuery(query, filter);
  }

  async findByWinnerId(
    winnerId: string,
    filter: AuctionsFilter,
  ): Promise<{ items: Auction[]; total: number }> {
    const query = {
      ...this.buildQuery(filter),
      winnerId: new Types.ObjectId(winnerId),
    };
    return this.executePaginatedQuery(query, filter);
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

  private buildQuery(filter: AuctionsFilter) {
    const query: Record<string, unknown> = {};

    if (filter.category) query.category = filter.category;
    if (filter.status) query.status = filter.status;
    if (filter.search) {
      query.title = { $regex: filter.search, $options: 'i' };
    }

    return query;
  }

  private async executePaginatedQuery(
    query: Record<string, unknown>,
    filter: AuctionsFilter,
  ): Promise<{ items: Auction[]; total: number }> {
    const skip = (filter.page - 1) * filter.limit;

    const [items, total] = await Promise.all([
      this.auctionModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(filter.limit)
        .exec(),
      this.auctionModel.countDocuments(query).exec(),
    ]);

    return { items, total };
  }
}
