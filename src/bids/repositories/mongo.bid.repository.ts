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
import { SortOrder } from '../../common/enums/sort-order.enum';

@Injectable()
export class MongoBidRepository implements IBidRepository {
  constructor(
    @InjectModel(Bid.name) private readonly bidModel: Model<BidDocument>,
  ) {}

  async startSession(): Promise<ClientSession> {
    return await this.bidModel.db.startSession();
  }

  async create(data: CreateBidData, session?: ClientSession): Promise<Bid> {
    const bids = await this.bidModel.create([data], { session });
    return bids[0].toObject();
  }

  async findWinningByAuctionId(
    auctionId: string,
    session?: ClientSession,
  ): Promise<Bid | null> {
    const bid = await this.bidModel
      .findOne(
        {
          auctionId: new Types.ObjectId(auctionId),
          status: BidStatus.WINNING,
        },
        null,
        { session },
      )
      .lean()
      .exec();
    return bid;
  }

  async findAll(
    page: number,
    limit: number,
    filter: BidsFilterInput,
  ): Promise<{ items: Bid[]; total: number }> {
    const skip = (page - 1) * limit;
    const query = filter?.status ? { status: filter.status } : {};

    const sortParams: Record<string, 1 | -1> = {};
    if (filter?.sort) {
      sortParams[filter.sort.field] =
        filter.sort.order === SortOrder.ASC ? 1 : -1;
    } else {
      sortParams['createdAt'] = -1;
    }

    const [items, total] = await Promise.all([
      this.bidModel
        .find(query)
        .sort(sortParams)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.bidModel.countDocuments(query).exec(),
    ]);

    return { items, total };
  }

  async findByAuctionId(
    auctionId: string,
    page: number,
    limit: number,
    filter: BidsFilterInput,
  ): Promise<{ items: Bid[]; total: number }> {
    const skip = (page - 1) * limit;
    const query: Record<string, any> = {
      auctionId: new Types.ObjectId(auctionId),
    };
    if (filter?.status) {
      query.status = filter.status;
    }

    const sortParams: Record<string, 1 | -1> = {};
    if (filter?.sort) {
      sortParams[filter.sort.field] =
        filter.sort.order === SortOrder.ASC ? 1 : -1;
    } else {
      sortParams['amount'] = -1;
      sortParams['createdAt'] = -1; // Highest bids first
    }

    const [items, total] = await Promise.all([
      this.bidModel
        .find(query)
        .sort(sortParams)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.bidModel.countDocuments(query).exec(),
    ]);

    return { items, total };
  }

  async findByBidderId(
    bidderId: string,
    page: number,
    limit: number,
    filter: BidsFilterInput,
  ): Promise<{ items: Bid[]; total: number }> {
    const skip = (page - 1) * limit;
    const query: Record<string, any> = {
      bidderId: new Types.ObjectId(bidderId),
    };
    if (filter?.status) {
      query.status = filter.status;
    }

    const sortParams: Record<string, 1 | -1> = {};
    if (filter?.sort) {
      sortParams[filter.sort.field] =
        filter.sort.order === SortOrder.ASC ? 1 : -1;
    } else {
      sortParams['createdAt'] = -1;
    }

    const [items, total] = await Promise.all([
      this.bidModel
        .find(query)
        .sort(sortParams)
        .skip(skip)
        .limit(limit)
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
      .findByIdAndUpdate(
        bidId,
        { status },
        { session, returnDocument: 'after' },
      )
      .exec();
  }

  async countByAuctionId(auctionId: string): Promise<number> {
    return this.bidModel
      .countDocuments({ auctionId: new Types.ObjectId(auctionId) })
      .exec();
  }
}
