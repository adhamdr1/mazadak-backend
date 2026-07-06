import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
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
import { LoginInput } from './dto/login.input';
import { NotificationsService } from '../notifications/notifications.service';
import { OAuth2Client } from 'google-auth-library';
import { RegistrationRequiredException } from './exceptions/registration-required.exception';
import { AuthProvider } from '../users/entities/user.entity';
import { GoogleLoginInput } from './dto/google-login.input';
import { GoogleRegisterInput } from './dto/google-register.input';

const SALT_ROUNDS = 12;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

interface DecodedJwt {
  exp: number;
}

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject('IAuthRepository')
    private readonly authRepository: IAuthRepository,
    private readonly notificationsService: NotificationsService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
    );
  }

  async register(registerInput: RegisterInput): Promise<AuthResponse> {
    // 1. Verify email is not taken.
    const existingUser = await this.usersService.findByEmail(
      registerInput.email,
    );
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // 2. Hash the raw password before persisting.
    const hashedPassword = await bcrypt.hash(
      registerInput.password,
      SALT_ROUNDS,
    );

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

    const verificationToken = this.generateEmailVerificationToken(
      user._id.toString(),
    );

    // Send email verification request
    await this.notificationsService.sendEmailVerification(
      user.email,
      verificationToken,
      user.firstName,
      user.phoneNumber,
    );

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

  async login(loginInput: LoginInput): Promise<AuthResponse> {
    // 1. Find user — use vague error to avoid leaking info.
    const user = await this.usersService.findByEmailWithPassword(
      loginInput.email,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Reject soft-deleted accounts.
    if (user.deletedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.password) {
      throw new UnauthorizedException(
        'This account is registered via Google. Please use Google Login.',
      );
    }

    if (!user.isEmailVerified) {
      throw new ForbiddenException(
        'Please verify your email before logging in',
      );
    }

    // 3. Compare password — password field has select:false, need to fetch it.
    const isPasswordValid = await bcrypt.compare(
      loginInput.password,
      user.password ?? '',
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 4. Build payload and generate tokens.
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = this.generateAccessToken(payload);
    const { token: refreshToken, expiresAt } =
      this.generateRefreshToken(payload);

    // 5. Persist hashed refresh token.
    await this.authRepository.saveRefreshToken(
      user._id.toString(),
      hashToken(refreshToken),
      expiresAt,
    );

    return { accessToken, refreshToken, user };
  }

  async googleRegister(input: GoogleRegisterInput): Promise<AuthResponse> {
    const payload = await this.verifyGoogleToken(input.token);
    if (!payload || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }
    const { sub: googleId, email, email_verified } = payload;
    if (!email_verified) {
      throw new UnauthorizedException('Google email is not verified');
    }
    // 1. التأكد أن الإيميل غير مسجل من قبل
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException(
        'Email already registered. Please login instead.',
      );
    }

    // 3. إنشاء المستخدم عبر الـ UsersService
    const user = await this.usersService.createGoogleUser({
      firstName: input.firstName,
      lastName: input.lastName,
      email: email,
      googleId: googleId,
      phoneNumber: input.phoneNumber,
      dateOfBirth: input.dateOfBirth,
      address: input.address,
    });

    // 4. توليد التوكنز
    const jwtPayload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };
    const accessToken = this.generateAccessToken(jwtPayload);
    const { token: refreshToken, expiresAt } =
      this.generateRefreshToken(jwtPayload);
    await this.authRepository.saveRefreshToken(
      user._id.toString(),
      hashToken(refreshToken),
      expiresAt,
    );
    return { accessToken, refreshToken, user };
  }

  async googleLogin(googleLoginInput: GoogleLoginInput): Promise<AuthResponse> {
    const payload = await this.verifyGoogleToken(googleLoginInput.token);
    if (!payload || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }
    const { sub: googleId, email, email_verified } = payload;
    // 2. Security Check
    if (!email_verified) {
      throw new UnauthorizedException('Google email is not verified');
    }
    // 3. Find User
    let user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new RegistrationRequiredException();
    }
    if (user.deletedAt) {
      throw new UnauthorizedException('Account disabled');
    }
    // 4. Link account if needed
    if (!user.googleId && user.authProvider === AuthProvider.LOCAL) {
      user = await this.usersService.linkGoogleAccount(
        user._id.toString(),
        googleId,
      );
    }
    // 5. Generate Tokens
    const jwtPayload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };
    const accessToken = this.generateAccessToken(jwtPayload);
    const { token: refreshToken, expiresAt } =
      this.generateRefreshToken(jwtPayload);
    await this.authRepository.saveRefreshToken(
      user._id.toString(),
      hashToken(refreshToken),
      expiresAt,
    );
    return { accessToken, refreshToken, user };
  }

  async confirmEmail(token: string): Promise<boolean> {
    try {
      // 1. فك تشفير التوكن والتأكد من صلاحيته باستخدام المفتاح المخصص للإيميل
      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: this.configService.getOrThrow<string>(
          'JWT_VERIFICATION_SECRET',
        ),
      });

      await this.usersService.verifyEmail(payload.sub);

      return true;
    } catch {
      throw new BadRequestException('Invalid or expired verification token');
    }
  }

  async resendConfirmationEmail(email: string): Promise<boolean> {
    const user = await this.usersService.findByEmail(email);

    // Security: Do not reveal if the email exists or not
    if (!user) {
      return true;
    }
    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }
    const verificationToken = this.generateEmailVerificationToken(
      user._id.toString(),
    );
    // Send email verification request
    await this.notificationsService.sendEmailVerification(
      user.email,
      verificationToken,
      user.firstName,
      user.phoneNumber,
    );
    return true;
  }

  async logout(refreshToken: string): Promise<boolean> {
    // نقوم بتشفير التوكن القادم لنطابقه مع المشفر في الداتا بيز ونحذفه
    await this.authRepository.deleteRefreshToken(hashToken(refreshToken));
    return true;
  }
  async logoutAll(userId: string): Promise<boolean> {
    // يحذف كل التوكنز الخاصة بهذا المستخدم (خروج من كل الأجهزة)
    await this.authRepository.deleteAllUserTokens(userId);
    return true;
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
      expiresIn: this.configService.get<StringValue>(
        'JWT_REFRESH_EXPIRES_IN',
        '7d',
      ),
    });

    // Decode the signed token to extract the exact `exp` timestamp.
    // This avoids duplicating the expiry logic — the JWT is the single source of truth.
    const decoded = this.jwtService.decode<DecodedJwt>(token);

    if (!decoded) {
      throw new Error('Invalid token');
    }

    const expiresAt = new Date(decoded.exp * 1000);

    return { token, expiresAt };
  }

  private generateEmailVerificationToken(userId: string): string {
    return this.jwtService.sign(
      { sub: userId },
      {
        secret: this.configService.getOrThrow<string>(
          'JWT_VERIFICATION_SECRET',
        ),
        expiresIn: this.configService.get<StringValue>(
          'JWT_VERIFICATION_EXPIRES_IN',
          '1h',
        ),
      },
    );
  }

  private async verifyGoogleToken(token: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      });
      return ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }
  }
}
