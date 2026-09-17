import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import Decimal from 'decimal.js';
import {
  IWithdrawalRepository,
  CreateWithdrawalData,
} from '../interfaces/withdrawal.repository.interface';
import {
  WithdrawalRequest,
  WithdrawalRequestDocument,
} from '../entities/withdrawal-request.entity';
import { WithdrawalStatus } from '../enums/withdrawal-status.enum';
import { WithdrawalsFilterInput, WithdrawalsPage } from '../dto';
import { PaginationInput } from '../../common/dto/pagination.input';
import { SortOrder } from '../../common/enums/sort-order.enum';

@Injectable()
export class MongoWithdrawalRepository implements IWithdrawalRepository {
  constructor(
    @InjectModel(WithdrawalRequest.name)
    private readonly withdrawalModel: Model<WithdrawalRequestDocument>,
  ) {}

  private getTodayDateInCairo(date: Date = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  private async queryPaginated(
    baseQuery: Record<string, unknown>,
    pagination: PaginationInput,
    filter?: WithdrawalsFilterInput,
    session?: ClientSession,
  ): Promise<WithdrawalsPage> {
    const query: Record<string, unknown> = { ...baseQuery };

    if (filter?.status) {
      query.status = filter.status;
    }

    if (filter?.payoutMethod) {
      query.payoutMethod = filter.payoutMethod;
    }

    if (filter?.startDate || filter?.endDate) {
      const createdAtQuery: Record<string, Date> = {};
      if (filter.startDate) {
        createdAtQuery.$gte = filter.startDate;
      }
      if (filter.endDate) {
        createdAtQuery.$lte = filter.endDate;
      }
      query.createdAt = createdAtQuery;
    }

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const sortDirection = filter?.sortOrder === SortOrder.ASC ? 1 : -1;

    const [items, total] = await Promise.all([
      this.withdrawalModel
        .find(query)
        .sort({ createdAt: sortDirection })
        .skip(skip)
        .limit(limit)
        .session(session || null)
        .exec(),
      this.withdrawalModel
        .countDocuments(query)
        .session(session || null)
        .exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      totalPages,
      hasNextPage: page < totalPages,
    };
  }

  async create(
    data: CreateWithdrawalData,
    session?: ClientSession,
  ): Promise<WithdrawalRequest> {
    const requestDate = data.requestDate || this.getTodayDateInCairo();

    const request = new this.withdrawalModel({
      userId: new Types.ObjectId(data.userId),
      amount: Types.Decimal128.fromString(new Decimal(data.amount).toString()),
      fee: Types.Decimal128.fromString(new Decimal(data.fee).toString()),
      feePercentage: data.feePercentage,
      netAmount: Types.Decimal128.fromString(
        new Decimal(data.netAmount).toString(),
      ),
      currency: data.currency || 'EGP',
      payoutMethod: data.payoutMethod,
      payoutDetails: data.payoutDetails,
      status: data.status || WithdrawalStatus.PENDING,
      holdTransactionId: data.holdTransactionId,
      requestDate,
    });

    return await request.save({ session });
  }

  async findById(
    id: string,
    session?: ClientSession,
  ): Promise<WithdrawalRequest | null> {
    return await this.withdrawalModel
      .findById(new Types.ObjectId(id))
      .session(session || null)
      .exec();
  }

  async findByUserId(
    userId: string,
    pagination: PaginationInput,
    filter?: WithdrawalsFilterInput,
    session?: ClientSession,
  ): Promise<WithdrawalsPage> {
    return this.queryPaginated(
      { userId: new Types.ObjectId(userId) },
      pagination,
      filter,
      session,
    );
  }

  async findAll(
    pagination: PaginationInput,
    filter?: WithdrawalsFilterInput,
    session?: ClientSession,
  ): Promise<WithdrawalsPage> {
    return this.queryPaginated({}, pagination, filter, session);
  }

  async updateStatus(
    id: string,
    status: WithdrawalStatus,
    extra?: Partial<WithdrawalRequest>,
    session?: ClientSession,
  ): Promise<WithdrawalRequest | null> {
    return await this.withdrawalModel
      .findByIdAndUpdate(
        new Types.ObjectId(id),
        {
          $set: {
            status,
            ...extra,
          },
        },
        { returnDocument: 'after', session: session || null },
      )
      .exec();
  }

  async transitionStatus(
    id: string,
    fromStatuses: WithdrawalStatus[],
    toStatus: WithdrawalStatus,
    extra?: Partial<WithdrawalRequest>,
    session?: ClientSession,
    filter?: { userId?: string },
  ): Promise<WithdrawalRequest | null> {
    const query: Record<string, unknown> = {
      _id: new Types.ObjectId(id),
      status: { $in: fromStatuses },
    };

    if (filter?.userId) {
      query.userId = new Types.ObjectId(filter.userId);
    }

    return await this.withdrawalModel
      .findOneAndUpdate(
        query,
        {
          $set: {
            status: toStatus,
            ...extra,
          },
        },
        { returnDocument: 'after', session: session || null },
      )
      .exec();
  }

  async hasActivePendingRequest(
    userId: string,
    session?: ClientSession,
  ): Promise<boolean> {
    const count = await this.withdrawalModel
      .countDocuments({
        userId: new Types.ObjectId(userId),
        status: {
          $in: [WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING],
        },
      })
      .session(session || null)
      .exec();
    return count > 0;
  }

  async hasRequestToday(
    userId: string,
    session?: ClientSession,
  ): Promise<boolean> {
    const today = this.getTodayDateInCairo();
    const count = await this.withdrawalModel
      .countDocuments({
        userId: new Types.ObjectId(userId),
        requestDate: today,
        status: {
          $in: [
            WithdrawalStatus.PENDING,
            WithdrawalStatus.PROCESSING,
            WithdrawalStatus.COMPLETED,
          ],
        },
      })
      .session(session || null)
      .exec();
    return count > 0;
  }

  async countPendingWithdrawals(session?: ClientSession): Promise<number> {
    return await this.withdrawalModel
      .countDocuments({
        status: WithdrawalStatus.PENDING,
      })
      .session(session || null)
      .exec();
  }

  async sumPendingWithdrawals(session?: ClientSession): Promise<number> {
    const result = await this.withdrawalModel
      .aggregate<{
        total: Types.Decimal128 | null;
      }>([
        {
          $match: {
            status: {
              $in: [WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING],
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ])
      .session(session || null);

    return result.length > 0 && result[0].total
      ? new Decimal(result[0].total.toString()).toNumber()
      : 0;
  }

  async sumCompletedWithdrawals(session?: ClientSession): Promise<number> {
    const result = await this.withdrawalModel
      .aggregate<{
        total: Types.Decimal128 | null;
      }>([
        {
          $match: {
            status: WithdrawalStatus.COMPLETED,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ])
      .session(session || null);

    return result.length > 0 && result[0].total
      ? new Decimal(result[0].total.toString()).toNumber()
      : 0;
  }

  async sumCollectedFees(session?: ClientSession): Promise<number> {
    const result = await this.withdrawalModel
      .aggregate<{
        total: Types.Decimal128 | null;
      }>([
        {
          $match: {
            status: WithdrawalStatus.COMPLETED,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$fee' },
          },
        },
      ])
      .session(session || null);

    return result.length > 0 && result[0].total
      ? new Decimal(result[0].total.toString()).toNumber()
      : 0;
  }
}
