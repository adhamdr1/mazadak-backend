import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUserRepository } from '../interfaces/user.repository.interface';
import { User, UserDocument } from '../entities/user.entity';

@Injectable()
export class MongoUserRepository implements IUserRepository {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async create(user: Partial<User>): Promise<User> {
    const createdUser = new this.userModel(user);

    return await createdUser.save();
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

  async update(id: string, data: Partial<User>): Promise<User | null> {
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

  async findAll(page: number, limit: number): Promise<User[]> {
    const skip = (page - 1) * limit;

    return await this.userModel
      .find({ deletedAt: null })
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
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
}
