import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IAuthRepository } from '../interfaces/auth-repository.interface';
import {
  RefreshToken,
  RefreshTokenDocument,
} from '../entities/refresh-token.entity';

@Injectable()
export class MongoAuthRepository implements IAuthRepository {
  constructor(
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
  ) { }

  async saveRefreshToken(
    userId: string,
    hashedToken: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.refreshTokenModel.create({
      userId: new Types.ObjectId(userId),
      hashedToken,
      expiresAt,
    });
  }

  async findRefreshToken(hashedToken: string): Promise<RefreshToken | null> {
    return this.refreshTokenModel.findOne({ hashedToken }).exec();
  }

  async deleteRefreshToken(hashedToken: string): Promise<void> {
    await this.refreshTokenModel.deleteOne({ hashedToken }).exec();
  }

  async deleteAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenModel
      .deleteMany({ userId: new Types.ObjectId(userId) })
      .exec();
  }
}
