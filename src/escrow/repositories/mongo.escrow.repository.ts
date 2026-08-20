import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import {
  IEscrowRepository,
  CreateEscrowData,
  UpdateEscrowExtraData,
} from '../interfaces';
import { Escrow, EscrowDocument } from '../entities';
import { EscrowStatus } from '../enums';
import { EscrowFilterInput } from '../dto';

@Injectable()
export class MongoEscrowRepository implements IEscrowRepository {
  constructor(
    @InjectModel(Escrow.name)
    private readonly escrowModel: Model<EscrowDocument>,
  ) {}

  async startSession(): Promise<ClientSession> {
    return this.escrowModel.db.startSession();
  }

  async create(
    data: CreateEscrowData,
    session?: ClientSession,
  ): Promise<Escrow> {
    const escrow = new this.escrowModel(data);
    return await escrow.save({ session });
  }

  async findById(id: string, session?: ClientSession): Promise<Escrow | null> {
    return await this.escrowModel
      .findById(new Types.ObjectId(id))
      .session(session || null)
      .exec();
  }

  async findByAuctionId(
    auctionId: string,
    session?: ClientSession,
  ): Promise<Escrow | null> {
    return await this.escrowModel
      .findOne({ auctionId: new Types.ObjectId(auctionId) })
      .session(session || null)
      .exec();
  }

  async findExpiredHeldEscrows(
    now: Date,
    limit: number = 50,
    session?: ClientSession,
  ): Promise<Escrow[]> {
    return await this.escrowModel
      .find({
        status: EscrowStatus.HELD,
        inspectionPeriodEndsAt: { $lte: now },
      })
      .limit(limit)
      .session(session || null)
      .exec();
  }

  async updateStatus(
    id: string,
    status: EscrowStatus,
    extra?: UpdateEscrowExtraData,
    session?: ClientSession,
  ): Promise<Escrow | null> {
    const updatePayload: Record<string, unknown> = { status };
    if (extra?.releasedAt !== undefined) {
      updatePayload.releasedAt = extra.releasedAt;
    }
    if (extra?.refundedAt !== undefined) {
      updatePayload.refundedAt = extra.refundedAt;
    }
    if (extra?.releaseReason !== undefined) {
      updatePayload.releaseReason = extra.releaseReason;
    }
    if (extra?.disputeId !== undefined) {
      updatePayload.disputeId = extra.disputeId;
    }

    return await this.escrowModel
      .findByIdAndUpdate(
        new Types.ObjectId(id),
        { $set: updatePayload },
        { new: true, session: session || null },
      )
      .exec();
  }

  async findPaginated(
    filter?: EscrowFilterInput,
    page: number = 1,
    limit: number = 10,
    session?: ClientSession,
  ): Promise<{ items: Escrow[]; total: number }> {
    const query: Record<string, unknown> = {};

    if (filter?.status) {
      query.status = filter.status;
    }

    if (filter?.auctionId) {
      query.auctionId = new Types.ObjectId(filter.auctionId);
    }

    if (filter?.buyerId) {
      query.buyerId = new Types.ObjectId(filter.buyerId);
    }

    if (filter?.sellerId) {
      query.sellerId = new Types.ObjectId(filter.sellerId);
    }

    if (filter?.userId) {
      const userObjectId = new Types.ObjectId(filter.userId);
      query.$or = [{ buyerId: userObjectId }, { sellerId: userObjectId }];
    }

    const safePage = page > 0 ? page : 1;
    const safeLimit = limit > 0 ? limit : 10;
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await Promise.all([
      this.escrowModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .session(session || null)
        .exec(),
      this.escrowModel
        .countDocuments(query)
        .session(session || null)
        .exec(),
    ]);

    return { items, total };
  }
}
