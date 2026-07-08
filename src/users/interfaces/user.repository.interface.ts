import { User } from '../entities/user.entity';

export interface IUserRepository {
  create(user: Partial<User>): Promise<User>;

  findById(id: string): Promise<User | null>;

  findByEmail(email: string): Promise<User | null>;

  findByEmailWithPassword(email: string): Promise<User | null>;

  findByUserIdWithPassword(userId: string): Promise<User | null>;

  findByPhoneNumber(phoneNumber: string): Promise<User | null>;

  findByGoogleId(googleId: string): Promise<User | null>;

  update(id: string, data: Partial<User>): Promise<User | null>;

  findAll(page: number, limit: number): Promise<User[]>;

  softDelete(id: string): Promise<void>;

  linkGoogleAccount(userId: string, googleId: string): Promise<User | null>;
}
