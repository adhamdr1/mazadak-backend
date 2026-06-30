import { User } from '../entities/user.entity';

export interface IUserRepository {
  create(user: Partial<User>): Promise<User>;

  findByEmail(email: string): Promise<User | null>;

  findByPhoneNumber(phoneNumber: string): Promise<User | null>;

  findById(id: string): Promise<User | null>;
}
