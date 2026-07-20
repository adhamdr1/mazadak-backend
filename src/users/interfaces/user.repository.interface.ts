import { ClientSession } from 'mongoose';
import { User } from '../entities/user.entity';
import { AuthProvider } from '../enums/auth-provider.enum';

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: Date;
  address: { city: string; street: string };
  password?: string; // Local users only
  googleId?: string; // Google users only
  authProvider?: AuthProvider;
  isEmailVerified?: boolean;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
  address?: { city: string; street: string };
  isEmailVerified?: boolean;
  password?: string;
}

export interface IUserRepository {
  create(data: CreateUserData, session?: ClientSession): Promise<User>;

  findById(id: string): Promise<User | null>;

  findByEmail(email: string): Promise<User | null>;

  findByEmailWithPassword(email: string): Promise<User | null>;

  findByUserIdWithPassword(userId: string): Promise<User | null>;

  findByPhoneNumber(phoneNumber: string): Promise<User | null>;

  findByGoogleId(googleId: string): Promise<User | null>;

  update(id: string, data: UpdateUserData): Promise<User | null>;

  findAll(
    page: number,
    limit: number,
  ): Promise<{ items: User[]; total: number }>;

  softDelete(id: string): Promise<void>;

  linkGoogleAccount(userId: string, googleId: string): Promise<User | null>;
}
