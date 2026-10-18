import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import {
  IEscrowRepository,
  CreateEscrowData,
  UpdateEscrowExtraData,
} from '../interfaces';
import { Escrow, EscrowDocument } from '../entities';
import { User, UserDocument } from '../../users/entities/user.entity';
import { EscrowStatus } from '../enums';
import { EscrowFilterInput } from '../dto';
import Decimal from 'decimal.js';

@Injectable()
export class MongoEscrowRepository implements IEscrowRepository {
  constructor(
    @InjectModel(Escrow.name)
    private readonly escrowModel: Model<EscrowDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
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
    } else if (filter?.excludeDisputed) {
      query.status = { $ne: EscrowStatus.DISPUTED };
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

    if (filter?.search) {
      await this.applySearchFilter(query, filter.search, session);
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

  private async applySearchFilter(
    query: Record<string, unknown>,
    search: string,
    session?: ClientSession,
  ): Promise<void> {
    const trimmed = search.trim();
    if (!trimmed) return;

    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escaped, 'i');

    const searchOrConditions: Array<Record<string, unknown>> = [
      { releaseReason: { $regex: searchRegex } },
    ];

    // Check if the search term is a hex string (support short IDs like #BC674A or full MongoIds)
    const cleanHex = trimmed.replace(/^#/, '');
    const isHex = /^[0-9a-fA-F]+$/.test(cleanHex);

    if (isHex) {
      if (cleanHex.length === 24) {
        const exactObjectId = new Types.ObjectId(cleanHex);
        searchOrConditions.push(
          { _id: exactObjectId },
          { auctionId: exactObjectId },
          { buyerId: exactObjectId },
          { sellerId: exactObjectId },
          { disputeId: exactObjectId },
        );
      } else if (cleanHex.length >= 3) {
        searchOrConditions.push(
          {
            $expr: {
              $regexMatch: {
                input: { $toString: '$_id' },
                regex: cleanHex,
                options: 'i',
              },
            },
          },
          {
            $expr: {
              $regexMatch: {
                input: { $toString: '$auctionId' },
                regex: cleanHex,
                options: 'i',
              },
            },
          },
        );
      }
    }

    // Match users by name (first/last/composite), email, and phone
    const userOrConditions: Array<Record<string, unknown>> = [
      { firstName: { $regex: searchRegex } },
      { lastName: { $regex: searchRegex } },
      { email: { $regex: searchRegex } },
      { phoneNumber: { $regex: searchRegex } },
    ];

    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      const firstEscaped = parts[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const restEscaped = parts
        .slice(1)
        .join(' ')
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      userOrConditions.push({
        $and: [
          { firstName: { $regex: new RegExp(firstEscaped, 'i') } },
          { lastName: { $regex: new RegExp(restEscaped, 'i') } },
        ],
      });
      userOrConditions.push({
        $and: [
          { firstName: { $regex: new RegExp(restEscaped, 'i') } },
          { lastName: { $regex: new RegExp(firstEscaped, 'i') } },
        ],
      });
    }

    const matchedUsers = await this.userModel
      .find({
        deletedAt: null,
        $or: userOrConditions,
      })
      .select('_id')
      .limit(50)
      .session(session || null)
      .lean()
      .exec();

    if (matchedUsers.length > 0) {
      const matchedUserIds = matchedUsers.map((u) => u._id);
      searchOrConditions.push(
        { buyerId: { $in: matchedUserIds } },
        { sellerId: { $in: matchedUserIds } },
      );
    }

    // Safely merge with existing $or (such as filter.userId) without overwriting
    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: searchOrConditions }];
      delete query.$or;
    } else {
      query.$or = searchOrConditions;
    }
  }

  async sumHeldEscrows(): Promise<number> {
    const result = await this.escrowModel.aggregate<{
      total: Types.Decimal128 | null;
    }>([
      {
        $match: {
          status: { $in: [EscrowStatus.HELD, EscrowStatus.DISPUTED] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    return result.length > 0 && result[0].total
      ? new Decimal(result[0].total.toString()).toNumber()
      : 0;
  }
}
