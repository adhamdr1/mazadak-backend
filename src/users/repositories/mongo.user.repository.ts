import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import {
  IUserRepository,
  CreateUserData,
  UpdateUserData,
} from '../interfaces/user.repository.interface';
import { User, UserDocument } from '../entities/user.entity';
import { AuthProvider } from '../enums/auth-provider.enum';

@Injectable()
export class MongoUserRepository implements IUserRepository {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async startSession(): Promise<ClientSession> {
    return await this.userModel.db.startSession();
  }

  async create(data: CreateUserData, session?: ClientSession): Promise<User> {
    const createdUser = new this.userModel(data);
    return await createdUser.save({ session });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userModel
      .findOne({
        email,
        deletedAt: null,
      })
      .exec();
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return await this.userModel
      .findOne({
        email,
        deletedAt: null,
      })
      .select('+password')
      .exec();
  }

  async findByUserIdWithPassword(userId: string): Promise<User | null> {
    return await this.userModel
      .findOne({
        _id: userId,
        deletedAt: null,
      })
      .select('+password')
      .exec();
  }

  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    return await this.userModel
      .findOne({
        phoneNumber,
        deletedAt: null,
      })
      .exec();
  }

  async findById(id: string): Promise<User | null> {
    return await this.userModel
      .findOne({
        _id: id,
        deletedAt: null,
      })
      .exec();
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return await this.userModel
      .findOne({
        googleId,
        deletedAt: null,
      })
      .exec();
  }

  async update(id: string, data: UpdateUserData): Promise<User | null> {
    return await this.userModel
      .findOneAndUpdate(
        {
          _id: id,
          deletedAt: null,
        },
        { $set: data },
        { returnDocument: 'after' },
      )
      .exec();
  }

  async findAll(
    page: number,
    limit: number,
    search?: string,
  ): Promise<{ items: User[]; total: number }> {
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {
      deletedAt: null,
    };
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.userModel
        .find(query)
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(query).exec(),
    ]);

    return { items, total };
  }

  async softDelete(id: string): Promise<void> {
    await this.userModel
      .findOneAndUpdate(
        {
          _id: id,
          deletedAt: null,
        },
        {
          deletedAt: new Date(),
        },
      )
      .exec();
  }

  async linkGoogleAccount(
    userId: string,
    googleId: string,
  ): Promise<User | null> {
    return await this.userModel
      .findOneAndUpdate(
        { _id: userId, deletedAt: null },
        {
          $set: {
            googleId,
            authProvider: AuthProvider.GOOGLE,
            isEmailVerified: true,
          },
        },
        { returnDocument: 'after' },
      )
      .exec();
  }
}
