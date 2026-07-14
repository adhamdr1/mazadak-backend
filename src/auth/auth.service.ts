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
import { createHash, randomBytes } from 'crypto';
import { StringValue } from 'ms';
import { LoginInput } from './dto/login.input';
import { NotificationsService } from '../notifications/notifications.service';
import { OAuth2Client } from 'google-auth-library';
import { RegistrationRequiredException } from './exceptions/registration-required.exception';
import { User } from '../users/entities/user.entity';
import { AuthProvider } from '../users/enums/auth-provider.enum';
import { GoogleLoginInput } from './dto/google-login.input';
import { GoogleRegisterInput } from './dto/google-register.input';
import { ForgotPasswordInput } from './dto/forgot-password.input';
import { ResetPasswordInput } from './dto/reset-password.input';
import { UpdatePasswordInput } from './dto/update-password.input';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Connection } from 'mongoose';
import { WalletService } from '../wallet/wallet.service';

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
    @InjectRedis() private readonly redis: Redis,
    @InjectConnection() private readonly connection: Connection,
    private readonly walletService: WalletService,
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
    // 3. Create user + wallet in a single atomic transaction.
    const user = await this.withTransaction(async (session) => {
      const u = await this.usersService.create(createInput, session);
      await this.walletService.createWallet(u._id.toString(), session);
      return u;
    });

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

    return this.issueAuthTokens(user);
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

    return this.issueAuthTokens(user);
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
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException(
        'Email already registered. Please login instead.',
      );
    }

    // Create user + wallet in a single atomic transaction.
    const user = await this.withTransaction(async (session) => {
      const u = await this.usersService.createGoogleUser(
        {
          firstName: input.firstName,
          lastName: input.lastName,
          email: email,
          googleId: googleId,
          phoneNumber: input.phoneNumber,
          dateOfBirth: input.dateOfBirth,
          address: input.address,
        },
        session,
      );
      await this.walletService.createWallet(u._id.toString(), session);
      return u;
    });

    return this.issueAuthTokens(user);
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
    return this.issueAuthTokens(user);
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

  async refreshTokens(rawRefreshToken: string): Promise<AuthResponse> {
    // 1. Hash the incoming token to match what's stored in DB.
    const hashedToken = hashToken(rawRefreshToken);

    // 2. Look up the token in DB — if not found, it's invalid or already used.
    const storedToken = await this.authRepository.findRefreshToken(hashedToken);
    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 3. Verify the JWT signature and expiry are still valid.
    //    Even if it's in DB, the JWT itself might be tampered with.
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(rawRefreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      // Token is expired or invalid — clean it up from DB.
      await this.authRepository.deleteRefreshToken(hashedToken);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 4. Token Rotation: delete the old token before issuing new ones.
    //    This prevents replay attacks — each refresh token is single-use.
    await this.authRepository.deleteRefreshToken(hashedToken);

    // 5. Fetch fresh user data — role/email might have changed since token was issued.
    const user = await this.usersService.findById(payload.sub);
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User not found or disabled');
    }

    return this.issueAuthTokens(user);
  }

  async forgotPassword(
    input: ForgotPasswordInput,
    ip: string,
    browser: string,
  ): Promise<boolean> {
    const user = await this.usersService.findByEmailWithPassword(input.email);
    if (!user) return true;
    // 1. التأكد إن الحساب له باسورد (لو معندوش، يبقى ده حساب Google Only عمره ما عمل باسورد)
    if (!user.password) {
      throw new BadRequestException(
        'This account does not have a password set. Please login using your social account.',
      );
    }
    // 2. حماية من تكرار الإرسال (Rate Limiting للإيميل لكل يوزر لمدة دقيقتين)
    const rateLimitKey = `rate-limit:forgot-password:${user._id.toString()}`;
    const recentlyRequested = await this.redis.get(rateLimitKey);
    if (recentlyRequested) return true; // لو لسه طالب من دقيقتين، متعملش حاجة
    await this.redis.set(rateLimitKey, '1', 'EX', 120);
    // 3. توليد وتشفير الـ Token
    const rawToken = this.generateSecureToken();
    const hashedToken = hashToken(rawToken);
    // 4. حفظ الـ Hashed Token في Redis بناءً على الـ userId
    const redisKey = this.getResetPasswordRedisKey(user._id.toString());
    const ttlSeconds = 900; // 15 Minutes
    await this.redis.set(redisKey, hashedToken, 'EX', ttlSeconds);
    const time = new Date().toUTCString();
    // 5. تمرير بيانات اليوزر للـ Notifications Service
    await this.notificationsService.sendPasswordResetEmail(
      user.email,
      rawToken, // بنبعت الـ rawToken في الإيميل
      { firstName: user.firstName, lastName: user.lastName },
      { ip, browser, time },
    );
    return true;
  }

  async resetPassword(input: ResetPasswordInput): Promise<boolean> {
    const user = await this.usersService.findByEmailWithPassword(input.email);
    if (!user) {
      throw new BadRequestException('Invalid user account');
    }
    // 1. نجيب الـ Hashed Token بتاع اليوزر من Redis
    const redisKey = this.getResetPasswordRedisKey(user._id.toString());
    const storedHashedToken = await this.redis.get(redisKey);
    if (!storedHashedToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    // 2. نعمل Hash للي اليوزر بعته ونقارن
    const inputHashedToken = hashToken(input.token);
    if (storedHashedToken !== inputHashedToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    // 3. تحديث الباسورد
    const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);
    await this.usersService.updatePassword(user._id.toString(), hashedPassword);
    // 4. مسح التوكن من Redis
    await this.redis.del(redisKey);
    // 5. طرد اليوزر من كل الأجهزة
    await this.logoutAll(user._id.toString());
    return true;
  }

  async updatePassword(
    userId: string,
    input: UpdatePasswordInput,
  ): Promise<boolean> {
    const user = await this.usersService.findByUserIdWithPassword(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.password) {
      throw new BadRequestException(
        'This account does not have a password set.',
      );
    }

    const isMatch = await bcrypt.compare(input.oldPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('Incorrect old password');
    }

    const isSamePassword = await bcrypt.compare(input.password, user.password);
    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);
    await this.usersService.updatePassword(userId, hashedPassword);
    await this.logoutAll(user._id.toString());
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

  private async issueAuthTokens(user: User): Promise<AuthResponse> {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };
    const accessToken = this.generateAccessToken(payload);
    const { token: refreshToken, expiresAt } =
      this.generateRefreshToken(payload);
    await this.authRepository.saveRefreshToken(
      user._id.toString(),
      hashToken(refreshToken),
      expiresAt,
    );
    return { accessToken, refreshToken, user };
  }

  private generateSecureToken(): string {
    return randomBytes(32).toString('hex');
  }

  private getResetPasswordRedisKey(userId: string): string {
    return `password-reset:${userId}`;
  }

  // ─── Transaction Helper ───────────────────────────────────────────────────

  private async withTransaction<T>(
    fn: (session: ClientSession) => Promise<T>,
  ): Promise<T> {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const result = await fn(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
