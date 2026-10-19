import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import {
  IDisputeRepository,
  CreateDisputeData,
  UpdateDisputeExtraData,
} from '../interfaces';
import { Dispute, DisputeDocument } from '../entities';
import { User, UserDocument } from '../../users/entities/user.entity';
import { DisputeStatus } from '../enums';
import { DisputeFilterInput } from '../dto';

@Injectable()
export class MongoDisputeRepository implements IDisputeRepository {
  constructor(
    @InjectModel(Dispute.name)
    private readonly disputeModel: Model<DisputeDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
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

    if (filter?.search) {
      await this.applySearchFilter(query, filter.search, session);
    }

    if (filter?.startDate || filter?.endDate) {
      const createdAtQuery: Record<string, Date> = {};
      if (filter.startDate) createdAtQuery['$gte'] = filter.startDate;
      if (filter.endDate) {
        const end = new Date(filter.endDate);
        end.setHours(23, 59, 59, 999);
        createdAtQuery['$lte'] = end;
      }
      query['createdAt'] = createdAtQuery;
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
      { description: { $regex: searchRegex } },
      { reason: { $regex: searchRegex } },
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
          { escrowId: exactObjectId },
          { openedById: exactObjectId },
          { againstUserId: exactObjectId },
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
          {
            $expr: {
              $regexMatch: {
                input: { $toString: '$escrowId' },
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
        { openedById: { $in: matchedUserIds } },
        { againstUserId: { $in: matchedUserIds } },
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
}
