import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { Bid, BidDocument } from '../entities/bid.entity';
import { BidStatus } from '../enums/bid-status.enum';
import { BidsFilterInput } from '../dto/bids-filter.input';
import {
  IBidRepository,
  CreateBidData,
} from '../interfaces/bid-repository.interface';

@Injectable()
export class MongoBidRepository implements IBidRepository {
  constructor(
    @InjectModel(Bid.name) private readonly bidModel: Model<BidDocument>,
  ) {}

  async create(data: CreateBidData, session?: ClientSession): Promise<Bid> {
    const bids = await this.bidModel.create([data], { session });
    return bids[0].toObject();
  }

  async findWinningByAuctionId(auctionId: string): Promise<Bid | null> {
    const bid = await this.bidModel
      .findOne({
        auctionId: new Types.ObjectId(auctionId),
        status: BidStatus.WINNING,
      })
      .lean()
      .exec();
    return bid;
  }

  async findByAuctionId(
    auctionId: string,
    filter: BidsFilterInput,
  ): Promise<{ items: Bid[]; total: number }> {
    const skip = (filter.page - 1) * filter.limit;
    const query = { auctionId: new Types.ObjectId(auctionId) };

    const [items, total] = await Promise.all([
      this.bidModel
        .find(query)
        .sort({ amount: -1, createdAt: -1 }) // Highest bids first
        .skip(skip)
        .limit(filter.limit)
        .lean()
        .exec(),
      this.bidModel.countDocuments(query).exec(),
    ]);

    return { items, total };
  }

  async findByBidderId(
    bidderId: string,
    filter: BidsFilterInput,
  ): Promise<{ items: Bid[]; total: number }> {
    const skip = (filter.page - 1) * filter.limit;
    const query = { bidderId: new Types.ObjectId(bidderId) };

    const [items, total] = await Promise.all([
      this.bidModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(filter.limit)
        .lean()
        .exec(),
      this.bidModel.countDocuments(query).exec(),
    ]);

    return { items, total };
  }

  async updateStatus(
    bidId: string,
    status: BidStatus,
    session?: ClientSession,
  ): Promise<void> {
    await this.bidModel
      .findByIdAndUpdate(bidId, { status }, { session, new: true })
      .exec();
  }
}
