import { Injectable, Inject } from '@nestjs/common';
import { ClientSession } from 'mongoose';
import { UpdateUserInput } from './dto/update-user.input';
import { PaginationInput } from '../common/dto/pagination.input';
import { CreateUserInput } from './dto/create-user.input';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';
import { AuthProvider } from './enums/auth-provider.enum';
import type { IUserRepository } from './interfaces/user.repository.interface';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateGoogleUserDto } from './dto/create-google-user.dto';
import { UsersPage } from './dto/users-page.type';
import { UserNotFoundException } from './exceptions/user-not-found.exception';
import { EmailAlreadyExistsException } from './exceptions/email-already-exists.exception';
import { PhoneAlreadyExistsException } from './exceptions/phone-already-exists.exception';
import { EmailAlreadyVerifiedException } from './exceptions/email-already-verified.exception';
import { UserForbiddenException } from './exceptions/user-forbidden.exception';

@Injectable()
export class UsersService {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private buildPage(
    items: User[],
    total: number,
    limit: number,
    page: number,
  ): UsersPage {
    return {
      items,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
    };
  }

  // ─── Internal (called by AuthService) ───────────────────────────────────────

  async create(
    createUserInput: CreateUserInput,
    session?: ClientSession,
  ): Promise<User> {
    const existingEmail = await this.userRepository.findByEmail(
      createUserInput.email,
    );
    if (existingEmail) throw new EmailAlreadyExistsException();

    const existingPhone = await this.userRepository.findByPhoneNumber(
      createUserInput.phoneNumber,
    );
    if (existingPhone) throw new PhoneAlreadyExistsException();

    return await this.userRepository.create(
      {
        firstName: createUserInput.firstName,
        lastName: createUserInput.lastName,
        email: createUserInput.email,
        password: createUserInput.password,
        phoneNumber: createUserInput.phoneNumber,
        dateOfBirth: createUserInput.dateOfBirth,
        address: createUserInput.address,
      },
      session,
    );
  }

  async createGoogleUser(
    dto: CreateGoogleUserDto,
    session?: ClientSession,
  ): Promise<User> {
    const existingEmail = await this.userRepository.findByEmail(dto.email);
    if (existingEmail) throw new EmailAlreadyExistsException();

    const existingPhone = await this.userRepository.findByPhoneNumber(
      dto.phoneNumber,
    );
    if (existingPhone) throw new PhoneAlreadyExistsException();

    return await this.userRepository.create(
      {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        authProvider: AuthProvider.GOOGLE,
        googleId: dto.googleId,
        isEmailVerified: true,
        phoneNumber: dto.phoneNumber,
        dateOfBirth: dto.dateOfBirth,
        address: dto.address,
      },
      session,
    );
  }

  // ─── Queries ─────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new UserNotFoundException();
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepository.findByEmailWithPassword(email);
  }

  async findByUserIdWithPassword(userId: string): Promise<User | null> {
    return this.userRepository.findByUserIdWithPassword(userId);
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepository.findByGoogleId(googleId);
  }

  async findAll(pagination: PaginationInput): Promise<UsersPage> {
    const { items, total } = await this.userRepository.findAll(
      pagination.page,
      pagination.limit,
    );
    return this.buildPage(items, total, pagination.limit, pagination.page);
  }

  // ─── Mutations ────────────────────────────────────────────────────────────────

  async updateProfile(
    currentUser: JwtPayload,
    targetId: string,
    data: UpdateUserInput,
  ): Promise<User> {
    if (currentUser.role !== UserRole.ADMIN && currentUser.sub !== targetId) {
      throw new UserForbiddenException();
    }

    if (data.email) {
      const existing = await this.userRepository.findByEmail(data.email);
      if (existing && existing._id.toString() !== targetId) {
        throw new EmailAlreadyExistsException();
      }
    }

    if (data.phoneNumber) {
      const existing = await this.userRepository.findByPhoneNumber(
        data.phoneNumber,
      );
      if (existing && existing._id.toString() !== targetId) {
        throw new PhoneAlreadyExistsException();
      }
    }

    const updated = await this.userRepository.update(targetId, data);
    if (!updated) throw new UserNotFoundException();
    return updated;
  }

  async verifyEmail(id: string): Promise<void> {
    const user = await this.findById(id);
    if (user.isEmailVerified) throw new EmailAlreadyVerifiedException();
    await this.userRepository.update(id, { isEmailVerified: true });
  }

  async softDelete(currentUser: JwtPayload, targetId: string): Promise<void> {
    if (currentUser.role !== UserRole.ADMIN && currentUser.sub !== targetId) {
      throw new UserForbiddenException();
    }
    await this.findById(targetId);
    await this.userRepository.softDelete(targetId);
  }

  async linkGoogleAccount(userId: string, googleId: string): Promise<User> {
    const updatedUser = await this.userRepository.linkGoogleAccount(
      userId,
      googleId,
    );
    if (!updatedUser) throw new UserNotFoundException();
    return updatedUser;
  }

  async updatePassword(id: string, newHashedPassword: string): Promise<void> {
    const updated = await this.userRepository.update(id, {
      password: newHashedPassword,
    });
    if (!updated) throw new UserNotFoundException();
  }
}
