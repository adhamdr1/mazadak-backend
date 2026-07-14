import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IWalletRepository } from '../interfaces/wallet.repository.interface';
import { Wallet, WalletDocument } from '../entities/wallet.entity';

@Injectable()
export class MongoWalletRepository implements IWalletRepository {
  constructor(
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<WalletDocument>,
  ) {}

  async create(userId: string): Promise<Wallet> {
    const wallet = new this.walletModel({ userId: new Types.ObjectId(userId) });
    return await wallet.save();
  }

  async findByUserId(userId: string): Promise<Wallet | null> {
    return await this.walletModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
  }

  async findById(walletId: string): Promise<Wallet | null> {
    return await this.walletModel.findById(new Types.ObjectId(walletId)).exec();
  }

  // Deposit: no condition needed, always safe to credit.
  async creditBalance(
    walletId: string,
    amount: number,
  ): Promise<Wallet | null> {
    return await this.walletModel
      .findByIdAndUpdate(
        new Types.ObjectId(walletId),
        { $inc: { balance: amount } },
        { returnDocument: 'after' },
      )
      .exec();
  }

  // Withdraw: atomically checks available balance before debiting.
  async debitBalance(walletId: string, amount: number): Promise<Wallet | null> {
    return await this.walletModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(walletId),
          $expr: {
            $gte: [{ $subtract: ['$balance', '$heldBalance'] }, amount],
          },
        },
        { $inc: { balance: -amount } },
        { returnDocument: 'after' },
      )
      .exec();
  }

  // Hold: atomically moves amount from available to held.
  async holdBalance(walletId: string, amount: number): Promise<Wallet | null> {
    return await this.walletModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(walletId),
          $expr: {
            $gte: [{ $subtract: ['$balance', '$heldBalance'] }, amount],
          },
        },
        { $inc: { balance: -amount, heldBalance: amount } },
        { returnDocument: 'after' },
      )
      .exec();
  }

  // Release: atomically moves amount back from held to available.
  async releaseBalance(
    walletId: string,
    amount: number,
  ): Promise<Wallet | null> {
    return await this.walletModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(walletId),
          $expr: { $gte: ['$heldBalance', amount] },
        },
        { $inc: { balance: amount, heldBalance: -amount } },
        { returnDocument: 'after' },
      )
      .exec();
  }

  // Capture: atomically removes amount from held (balance was already debited during hold).
  async captureHeldBalance(
    walletId: string,
    amount: number,
  ): Promise<Wallet | null> {
    return await this.walletModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(walletId),
          $expr: { $gte: ['$heldBalance', amount] },
        },
        { $inc: { heldBalance: -amount } },
        { returnDocument: 'after' },
      )
      .exec();
  }
}
