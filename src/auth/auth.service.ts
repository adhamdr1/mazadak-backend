import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterInput } from './dto/register.input';
import { AuthResponse } from './dto/auth.response';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import type { IAuthRepository } from './interfaces/auth-repository.interface';
import { CreateUserInput } from '../users/dto/create-user.input';
import { createHash } from 'crypto';
import { StringValue } from 'ms';


const SALT_ROUNDS = 12;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject('IAuthRepository')
    private readonly authRepository: IAuthRepository,
  ) { }

  async register(registerInput: RegisterInput): Promise<AuthResponse> {
    // 1. Verify email is not taken.
    const existingUser = await this.usersService.findByEmail(
      registerInput.email,
    );
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // 2. Hash the raw password before persisting.
    const hashedPassword = await bcrypt.hash(registerInput.password, SALT_ROUNDS);

    // 3. Delegate user creation to UsersService.
    // Phone uniqueness check is handled inside UsersService.create().
    const createInput: CreateUserInput = {
      firstName: registerInput.firstName,
      lastName: registerInput.lastName,
      email: registerInput.email,
      password: hashedPassword,
      phoneNumber: registerInput.phoneNumber,
      dateOfBirth: registerInput.dateOfBirth,
      address: registerInput.address,
    };
    const user = await this.usersService.create(createInput);

    // 4. Build JWT payload — never put sensitive data (password, etc.) in the payload.
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    // 5. Generate both tokens.
    const accessToken = this.generateAccessToken(payload);
    const { token: refreshToken, expiresAt } =
      this.generateRefreshToken(payload);

    // 6. Persist the refresh token so we can revoke it later.
    await this.authRepository.saveRefreshToken(
      user._id.toString(),
      hashToken(refreshToken),
      expiresAt,
    );

    return { accessToken, refreshToken, user };
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<StringValue>('JWT_EXPIRES_IN', '15m'),
    });
  }

  private generateRefreshToken(payload: JwtPayload): {
    token: string;
    expiresAt: Date;
  } {
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<StringValue>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    // Decode the signed token to extract the exact `exp` timestamp.
    // This avoids duplicating the expiry logic — the JWT is the single source of truth.
    const decoded = this.jwtService.decode(token) as { exp: number };
    const expiresAt = new Date(decoded.exp * 1000);

    return { token, expiresAt };
  }
}