import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { AutoBid, AutoBidDocument } from '../entities/auto-bid.entity';
import { AutoBidStatus } from '../enums/auto-bid-status.enum';
import {
  IAutoBidRepository,
  SetAutoBidData,
} from '../interfaces/auto-bid-repository.interface';

@Injectable()
export class MongoAutoBidRepository implements IAutoBidRepository {
  constructor(
    @InjectModel(AutoBid.name)
    private readonly autoBidModel: Model<AutoBidDocument>,
  ) {}

  async startSession(): Promise<ClientSession> {
    return await this.autoBidModel.db.startSession();
  }

  async findActiveByAuctionId(
    auctionId: string,
    session?: ClientSession,
  ): Promise<AutoBid[]> {
    const docs = await this.autoBidModel
      .find({
        auctionId: new Types.ObjectId(auctionId),
        status: AutoBidStatus.ACTIVE,
      })
      .sort({ maxAmount: -1, createdAt: 1 })
      .session(session ?? null)
      .exec();

    return docs.map((d) => d.toObject());
  }

  async findByAuctionAndUser(
    auctionId: string,
    userId: string,
    session?: ClientSession,
  ): Promise<AutoBid | null> {
    const doc = await this.autoBidModel
      .findOne(
        {
          auctionId: new Types.ObjectId(auctionId),
          userId: new Types.ObjectId(userId),
        },
        null,
        { session },
      )
      .exec();

    return doc ? doc.toObject() : null;
  }

  async findActiveByAuctionAndUser(
    auctionId: string,
    userId: string,
    session?: ClientSession,
  ): Promise<AutoBid | null> {
    const doc = await this.autoBidModel
      .findOne(
        {
          auctionId: new Types.ObjectId(auctionId),
          userId: new Types.ObjectId(userId),
          status: AutoBidStatus.ACTIVE,
        },
        null,
        { session },
      )
      .exec();

    return doc ? doc.toObject() : null;
  }

  async findActiveByAuctionAndMaxAmount(
    auctionId: string,
    maxAmount: number,
    session?: ClientSession,
  ): Promise<AutoBid | null> {
    const doc = await this.autoBidModel
      .findOne(
        {
          auctionId: new Types.ObjectId(auctionId),
          maxAmount: Types.Decimal128.fromString(maxAmount.toFixed(2)),
          status: AutoBidStatus.ACTIVE,
        },
        null,
        { session },
      )
      .exec();

    return doc ? doc.toObject() : null;
  }

  async upsert(
    data: SetAutoBidData,
    session?: ClientSession,
  ): Promise<AutoBid> {
    const doc = await this.autoBidModel
      .findOneAndUpdate(
        {
          auctionId: new Types.ObjectId(data.auctionId),
          userId: new Types.ObjectId(data.userId),
        },
        {
          $set: {
            maxAmount: Types.Decimal128.fromString(data.maxAmount.toFixed(2)),
            status: AutoBidStatus.ACTIVE,
          },
        },
        {
          returnDocument: 'after',
          upsert: true,
          session,
          setDefaultsOnInsert: true,
        },
      )
      .exec();

    return doc ? doc.toObject() : (null as unknown as AutoBid);
  }

  async updateStatus(
    autoBidId: string,
    status: AutoBidStatus,
    session?: ClientSession,
  ): Promise<void> {
    await this.autoBidModel
      .findByIdAndUpdate(
        new Types.ObjectId(autoBidId),
        { $set: { status } },
        { session, returnDocument: 'after' },
      )
      .exec();
  }

  async cancel(
    auctionId: string,
    userId: string,
    session?: ClientSession,
  ): Promise<AutoBid | null> {
    const doc = await this.autoBidModel
      .findOneAndUpdate(
        {
          auctionId: new Types.ObjectId(auctionId),
          userId: new Types.ObjectId(userId),
          status: AutoBidStatus.ACTIVE,
        },
        {
          $set: { status: AutoBidStatus.CANCELLED },
        },
        {
          returnDocument: 'after',
          session,
        },
      )
      .exec();

    return doc ? doc.toObject() : null;
  }

  async findByUserId(
    userId: string,
    page = 1,
    limit = 10,
    status?: AutoBidStatus,
  ): Promise<{ items: AutoBid[]; total: number }> {
    const skip = (page - 1) * limit;
    const query: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };
    if (status) {
      query.status = status;
    }

    const [docs, total] = await Promise.all([
      this.autoBidModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.autoBidModel.countDocuments(query).exec(),
    ]);

    return { items: docs.map((d) => d.toObject()), total };
  }

  async deactivateAllForAuction(
    auctionId: string,
    targetStatus: AutoBidStatus = AutoBidStatus.EXHAUSTED,
    session?: ClientSession,
  ): Promise<void> {
    await this.autoBidModel
      .updateMany(
        {
          auctionId: new Types.ObjectId(auctionId),
          status: AutoBidStatus.ACTIVE,
        },
        {
          $set: { status: targetStatus },
        },
        { session },
      )
      .exec();
  }

  async countActiveByAuction(
    auctionId: string,
    session?: ClientSession,
  ): Promise<number> {
    return await this.autoBidModel
      .countDocuments(
        {
          auctionId: new Types.ObjectId(auctionId),
          status: AutoBidStatus.ACTIVE,
        },
        { session },
      )
      .exec();
  }
}
