import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import {
  IDisputeRepository,
  CreateDisputeData,
  UpdateDisputeExtraData,
} from '../interfaces';
import { Dispute, DisputeDocument } from '../entities';
import { DisputeStatus } from '../enums';
import { DisputeFilterInput } from '../dto';

@Injectable()
export class MongoDisputeRepository implements IDisputeRepository {
  constructor(
    @InjectModel(Dispute.name)
    private readonly disputeModel: Model<DisputeDocument>,
  ) {}

  async startSession(): Promise<ClientSession> {
    return this.disputeModel.db.startSession();
  }

  async create(
    data: CreateDisputeData,
    session?: ClientSession,
  ): Promise<Dispute> {
    const dispute = new this.disputeModel(data);
    return await dispute.save({ session });
  }

  async findById(id: string, session?: ClientSession): Promise<Dispute | null> {
    return await this.disputeModel
      .findById(new Types.ObjectId(id))
      .session(session || null)
      .exec();
  }

  async findByEscrowId(
    escrowId: string,
    session?: ClientSession,
  ): Promise<Dispute | null> {
    return await this.disputeModel
      .findOne({ escrowId: new Types.ObjectId(escrowId) })
      .session(session || null)
      .exec();
  }

  async findByAuctionId(
    auctionId: string,
    session?: ClientSession,
  ): Promise<Dispute | null> {
    return await this.disputeModel
      .findOne({ auctionId: new Types.ObjectId(auctionId) })
      .session(session || null)
      .exec();
  }

  async updateStatus(
    id: string,
    status: DisputeStatus,
    extra?: UpdateDisputeExtraData,
    session?: ClientSession,
  ): Promise<Dispute | null> {
    const updatePayload: Record<string, unknown> = { status };
    if (extra?.adminId !== undefined) {
      updatePayload.adminId = extra.adminId;
    }
    if (extra?.adminDecision !== undefined) {
      updatePayload.adminDecision = extra.adminDecision;
    }
    if (extra?.adminNotes !== undefined) {
      updatePayload.adminNotes = extra.adminNotes;
    }
    if (extra?.resolvedAt !== undefined) {
      updatePayload.resolvedAt = extra.resolvedAt;
    }

    return await this.disputeModel
      .findByIdAndUpdate(
        new Types.ObjectId(id),
        { $set: updatePayload },
        { new: true, session: session || null },
      )
      .exec();
  }

  async findPaginated(
    filter?: DisputeFilterInput,
    page: number = 1,
    limit: number = 10,
    session?: ClientSession,
  ): Promise<{ items: Dispute[]; total: number }> {
    const query: Record<string, unknown> = {};

    if (filter?.status) {
      query.status = filter.status;
    }

    if (filter?.auctionId) {
      query.auctionId = new Types.ObjectId(filter.auctionId);
    }

    if (filter?.openedById) {
      query.openedById = new Types.ObjectId(filter.openedById);
    }

    if (filter?.againstUserId) {
      query.againstUserId = new Types.ObjectId(filter.againstUserId);
    }

    if (filter?.userId) {
      const userObjectId = new Types.ObjectId(filter.userId);
      query.$or = [
        { openedById: userObjectId },
        { againstUserId: userObjectId },
      ];
    }

    const safePage = page > 0 ? page : 1;
    const safeLimit = limit > 0 ? limit : 10;
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await Promise.all([
      this.disputeModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .session(session || null)
        .exec(),
      this.disputeModel
        .countDocuments(query)
        .session(session || null)
        .exec(),
    ]);

    return { items, total };
  }
}
