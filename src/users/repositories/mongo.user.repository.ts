import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import {
  IUserRepository,
  CreateUserData,
  UpdateUserData,
  UsersFilter,
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
      })
      .exec();
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return await this.userModel
      .findOne({
        email,
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

  async findByIdIncludingDeleted(id: string): Promise<User | null> {
    return await this.userModel.findById(id).exec();
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return await this.userModel
      .findOne({
        googleId,
        deletedAt: null,
      })
      .exec();
  }

  async update(
    id: string,
    data: UpdateUserData,
    session?: ClientSession,
  ): Promise<User | null> {
    return await this.userModel
      .findOneAndUpdate(
        {
          _id: id,
          deletedAt: null,
        },
        { $set: data },
        { returnDocument: 'after', session },
      )
      .exec();
  }

  async findAll(
    page: number,
    limit: number,
    filter?: UsersFilter,
  ): Promise<{ items: User[]; total: number }> {
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {
      deletedAt: null,
    };

    if (filter?.search) {
      query.$text = { $search: filter.search };
    }

    const sortParams: Record<string, 1 | -1> = {};
    if (filter?.sort) {
      sortParams[filter.sort.field] = filter.sort.order === 'ASC' ? 1 : -1;
    } else {
      sortParams['createdAt'] = -1; // Default
    }

    const [items, total] = await Promise.all([
      this.userModel
        .find(query)
        .sort(sortParams)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(query).exec(),
    ]);

    return { items, total };
  }

  async countVerified(): Promise<number> {
    return await this.userModel
      .countDocuments({
        isEmailVerified: true,
        deletedAt: null,
      })
      .exec();
  }

  async countAll(filter?: UsersFilter): Promise<number> {
    const query: Record<string, any> = {
      deletedAt: null,
    };

    if (filter?.search) {
      query.$text = { $search: filter.search };
    }

    return await this.userModel.countDocuments(query).exec();
  }

  async softDelete(id: string, session?: ClientSession): Promise<void> {
    await this.userModel
      .findOneAndUpdate(
        {
          _id: id,
          deletedAt: null,
        },
        {
          deletedAt: new Date(),
          isEmailVerified: false,
        },
        { session },
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

  async reactivate(id: string, session?: ClientSession): Promise<User | null> {
    return await this.userModel
      .findOneAndUpdate(
        { _id: id, deletedAt: { $ne: null } },
        {
          $set: {
            deletedAt: null,
            isEmailVerified: true,
          },
        },
        { returnDocument: 'after', session },
      )
      .exec();
  }
}
