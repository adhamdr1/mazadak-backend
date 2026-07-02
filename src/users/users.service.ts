import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UpdateUserInput } from './dto/update-user.input';
import { PaginationInput } from '../common/dto/pagination.input';
import { CreateUserInput } from './dto/create-user.input';
import { User, UserRole } from './entities/user.entity';
import type { IUserRepository } from './interfaces/user.repository.interface';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

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

  async updateProfile(
    currentUser: JwtPayload,
    targetId: string,
    data: UpdateUserInput,
  ): Promise<User> {
    // 1. Authorization: user can only update themselves unless admin.
    if (currentUser.role !== UserRole.ADMIN && currentUser.sub !== targetId) {
      throw new ForbiddenException('You can only update your own profile');
    }
    // 2. Email uniqueness check.
    if (data.email) {
      const existing = await this.userRepository.findByEmail(data.email);
      if (existing && existing._id.toString() !== targetId) {
        throw new ConflictException('Email already exists');
      }
    }
    // 3. Phone uniqueness check.
    if (data.phoneNumber) {
      const existing = await this.userRepository.findByPhoneNumber(
        data.phoneNumber,
      );
      if (existing && existing._id.toString() !== targetId) {
        throw new ConflictException('Phone number already exists');
      }
    }
    const updated = await this.userRepository.update(targetId, data);
    if (!updated) {
      throw new NotFoundException('User not found');
    }
    return updated;
  }

  // async verifyEmail(id: string): Promise<void> {
  //   // Delegates to update — which already throws NotFoundException if not found.
  //   await this.updateProfile(id, { isEmailVerified: true });
  // }

  async softDelete(currentUser: JwtPayload, targetId: string): Promise<void> {
    // Authorization: user can only delete themselves unless admin.
    if (currentUser.role !== UserRole.ADMIN && currentUser.sub !== targetId) {
      throw new ForbiddenException('You can only delete your own account');
    }
    // Verify the target user exists. The repository only performs the delete operation.
    await this.findById(targetId);
    await this.userRepository.softDelete(targetId);
  }
}
