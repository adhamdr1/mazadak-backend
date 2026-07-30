import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ITransactionRepository,
  CreateTransactionData,
} from '../interfaces/transaction.repository.interface';
import {
  Transaction,
  TransactionDocument,
} from '../entities/transaction.entity';
import { TransactionsFilterInput } from '../dto/transactions-filter.input';
import { SortOrder } from '../../common/enums/sort-order.enum';

@Injectable()
export class MongoTransactionRepository implements ITransactionRepository {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
  ) {}

  async create(data: CreateTransactionData): Promise<Transaction> {
    const transaction = new this.transactionModel({
      walletId: new Types.ObjectId(data.walletId),
      type: data.type,
      amount: data.amount,
      status: data.status,
      referenceId: data.referenceId ?? null,
    });
    return transaction.save();
  }

  private buildFilterQuery(
    baseFilter: Record<string, unknown>,
    filter?: TransactionsFilterInput,
  ): Record<string, unknown> {
    const query = { ...baseFilter };
    if (!filter) return query;

    if (filter.type) query['type'] = filter.type;
    if (filter.status) query['status'] = filter.status;
    if (filter.search) {
      query['referenceId'] = { $regex: filter.search, $options: 'i' };
    }

    if (filter.startDate || filter.endDate) {
      const createdAtQuery: Record<string, Date> = {};
      if (filter.startDate) createdAtQuery['$gte'] = filter.startDate;
      if (filter.endDate) createdAtQuery['$lte'] = filter.endDate;
      query['createdAt'] = createdAtQuery;
    }

    return query;
  }

  async findByWalletId(
    walletId: string,
    page: number,
    limit: number,
    filter?: TransactionsFilterInput,
  ): Promise<Transaction[]> {
    const query = this.buildFilterQuery(
      { walletId: new Types.ObjectId(walletId) },
      filter,
    );

    const sortParams: Record<string, 1 | -1> = {};
    if (filter?.sort) {
      sortParams[filter.sort.field] =
        filter.sort.order === SortOrder.ASC ? 1 : -1;
    } else {
      sortParams['createdAt'] = -1;
    }

    return this.transactionModel
      .find(query)
      .sort(sortParams)
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
  }

  async countByWalletId(
    walletId: string,
    filter?: TransactionsFilterInput,
  ): Promise<number> {
    const query = this.buildFilterQuery(
      { walletId: new Types.ObjectId(walletId) },
      filter,
    );

    return this.transactionModel.countDocuments(query).exec();
  }

  async findAll(
    page: number,
    limit: number,
    filter?: TransactionsFilterInput,
  ): Promise<Transaction[]> {
    const query = this.buildFilterQuery({}, filter);

    const sortParams: Record<string, 1 | -1> = {};
    if (filter?.sort) {
      sortParams[filter.sort.field] =
        filter.sort.order === SortOrder.ASC ? 1 : -1;
    } else {
      sortParams['createdAt'] = -1;
    }

    return this.transactionModel
      .find(query)
      .sort(sortParams)
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
  }

  async countAll(filter?: TransactionsFilterInput): Promise<number> {
    const query = this.buildFilterQuery({}, filter);
    return this.transactionModel.countDocuments(query).exec();
  }
}
