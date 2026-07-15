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
import { TransactionType } from '../enums/transaction-type.enum';

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

  async findByWalletId(
    walletId: string,
    page: number,
    limit: number,
    type?: TransactionType,
  ): Promise<Transaction[]> {
    const filter: Record<string, unknown> = {
      walletId: new Types.ObjectId(walletId),
    };
    if (type) filter['type'] = type;

    return this.transactionModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
  }

  async countByWalletId(
    walletId: string,
    type?: TransactionType,
  ): Promise<number> {
    const filter: Record<string, unknown> = {
      walletId: new Types.ObjectId(walletId),
    };
    if (type) filter['type'] = type;

    return this.transactionModel.countDocuments(filter).exec();
  }
}
