import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaginationInput } from '../common/dto/pagination.input';
import { CreateUserInput } from './dto/create-user.input';
import { User } from './entities/user.entity';
import type { IUserRepository } from './interfaces/user.repository.interface';

@Injectable()
export class UsersService {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async create(createUserInput: CreateUserInput): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(
      createUserInput.email,
    );

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const existingPhone = await this.userRepository.findByPhoneNumber(
      createUserInput.phoneNumber,
    );

    if (existingPhone) {
      throw new ConflictException('Phone number already exists');
    }

    // TODO: Create wallet after user creation (WalletModule).
    // This should be done inside a MongoDB transaction when WalletModule is implemented.

    return await this.userRepository.create({
      firstName: createUserInput.firstName,
      lastName: createUserInput.lastName,
      email: createUserInput.email,
      password: createUserInput.password, // Password is already hashed by AuthService.
      phoneNumber: createUserInput.phoneNumber,
      dateOfBirth: createUserInput.dateOfBirth,
      address: createUserInput.address,
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    // Returns null if not found — caller (AuthService) decides what to do.
    return this.userRepository.findByEmail(email);
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    // Returns null if not found — caller (AuthService) decides what to do.
    return this.userRepository.findByEmailWithPassword(email);
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    // Returns null if not found — caller (AuthService) decides what to do.
    return this.userRepository.findByGoogleId(googleId);
  }

  async findAll(pagination: PaginationInput): Promise<User[]> {
    return this.userRepository.findAll(pagination.page, pagination.limit);
  }

  async updateProfile(id: string, data: Partial<User>): Promise<User> {
    const updated = await this.userRepository.update(id, data);

    if (!updated) {
      throw new NotFoundException('User not found');
    }

    return updated;
  }

  async verifyEmail(id: string): Promise<void> {
    // Delegates to update — which already throws NotFoundException if not found.
    await this.updateProfile(id, { isEmailVerified: true });
  }

  async softDelete(id: string): Promise<void> {
    // Check existence first — softDelete returns void so we can't detect "not found".
    await this.findById(id);
    await this.userRepository.softDelete(id);
  }
}
