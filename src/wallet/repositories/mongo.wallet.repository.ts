import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { IWalletRepository } from '../interfaces/wallet.repository.interface';
import { Wallet, WalletDocument } from '../entities/wallet.entity';
import Decimal from 'decimal.js';

@Injectable()
export class MongoWalletRepository implements IWalletRepository {
  constructor(
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<WalletDocument>,
  ) {}

  async create(userId: string, session?: ClientSession): Promise<Wallet> {
    const wallet = new this.walletModel({ userId: new Types.ObjectId(userId) });
    return await wallet.save({ session });
  }

  async findByUserId(userId: string): Promise<Wallet | null> {
    return await this.walletModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
  }

  async findById(walletId: string): Promise<Wallet | null> {
    return await this.walletModel.findById(new Types.ObjectId(walletId)).exec();
  }

  async findAll(page: number, limit: number): Promise<Wallet[]> {
    const skip = (page - 1) * limit;
    return await this.walletModel
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async countAll(): Promise<number> {
    return await this.walletModel.countDocuments().exec();
  }

  async sumAllBalances(): Promise<number> {
    const result = await this.walletModel.aggregate<{
      totalBalance: Types.Decimal128 | null;
    }>([
      {
        $group: {
          _id: null,
          totalBalance: { $sum: '$balance' },
        },
      },
    ]);
    return result.length > 0 && result[0].totalBalance
      ? new Decimal(result[0].totalBalance.toString()).toNumber()
      : 0;
  }

  // Deposit: no condition needed, always safe to credit.
  async creditBalance(
    walletId: string,
    amount: number,
    session?: ClientSession,
  ): Promise<Wallet | null> {
    const decimalAmount = Types.Decimal128.fromString(
      new Decimal(amount).toString(),
    );
    return await this.walletModel
      .findByIdAndUpdate(
        new Types.ObjectId(walletId),
        { $inc: { balance: decimalAmount } },
        { returnDocument: 'after', session },
      )
      .exec();
  }

  // Withdraw: atomically checks available balance before debiting.
  async debitBalance(
    walletId: string,
    amount: number,
    session?: ClientSession,
  ): Promise<Wallet | null> {
    const decimalAmount = Types.Decimal128.fromString(
      new Decimal(amount).toString(),
    );
    const negativeDecimalAmount = Types.Decimal128.fromString(
      new Decimal(amount).negated().toString(),
    );
    return await this.walletModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(walletId),
          $expr: {
            $gte: [{ $subtract: ['$balance', '$heldBalance'] }, decimalAmount],
          },
        },
        { $inc: { balance: negativeDecimalAmount } },
        { returnDocument: 'after', session },
      )
      .exec();
  }

  // Hold: atomically moves amount from available to held.
  async holdBalance(
    walletId: string,
    amount: number,
    session?: ClientSession,
  ): Promise<Wallet | null> {
    const decimalAmount = Types.Decimal128.fromString(
      new Decimal(amount).toString(),
    );
    return await this.walletModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(walletId),
          $expr: {
            $gte: [{ $subtract: ['$balance', '$heldBalance'] }, decimalAmount],
          },
        },
        { $inc: { heldBalance: decimalAmount } },
        { returnDocument: 'after', session },
      )
      .exec();
  }

  // Release: atomically moves amount back from held to available.
  async releaseBalance(
    walletId: string,
    amount: number,
    session?: ClientSession,
  ): Promise<Wallet | null> {
    const decimalAmount = Types.Decimal128.fromString(
      new Decimal(amount).toString(),
    );
    const negativeDecimalAmount = Types.Decimal128.fromString(
      new Decimal(amount).negated().toString(),
    );
    return await this.walletModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(walletId),
          $expr: { $gte: ['$heldBalance', decimalAmount] },
        },
        { $inc: { heldBalance: negativeDecimalAmount } },
        { returnDocument: 'after', session },
      )
      .exec();
  }

  // Capture: settles a held amount by deducting it from the total balance and releasing the corresponding held balance.
  async captureHeldBalance(
    walletId: string,
    amount: number,
    session?: ClientSession,
  ): Promise<Wallet | null> {
    const decimalAmount = Types.Decimal128.fromString(
      new Decimal(amount).toString(),
    );
    const negativeDecimalAmount = Types.Decimal128.fromString(
      new Decimal(amount).negated().toString(),
    );
    return await this.walletModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(walletId),
          $expr: { $gte: ['$heldBalance', decimalAmount] },
        },
        {
          $inc: {
            balance: negativeDecimalAmount,
            heldBalance: negativeDecimalAmount,
          },
        },
        { returnDocument: 'after', session },
      )
      .exec();
  }
}
