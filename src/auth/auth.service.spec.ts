import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Types } from 'mongoose';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { AuthProvider } from '../users/enums/auth-provider.enum';
import { RegistrationRequiredException } from './exceptions/registration-required.exception';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { getRedisConnectionToken } from '@nestjs-modules/ioredis';

// ─── Mock google-auth-library ──────────────────────────────────────────────
// يجب إنشاء الـ mock قبل أي import يستخدم google-auth-library.
// ليه mockVerifyIdToken يبدأ بـ mock؟
// Jest بيعمل hoisting للـ jest.mock() فوق الـ imports، لكن الـ variables
// العادية بتتحل بعد الـ imports. الحل: المتغير لازم اسمه يبدأ بـ mock
// عشان Jest يعرف يرفعه (hoist) مع الـ factory function.
const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

// ─── Mock bcrypt ───────────────────────────────────────────────────────────
// بنعمل mock لـ bcrypt عشان:
// 1. bcrypt.hash بياخد ~100ms (slow) في كل test
// 2. بنعمل unit test للـ logic مش للـ hashing itself
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// ─── Constants ────────────────────────────────────────────────────────────
const MOCK_ACCESS_TOKEN = 'mock-access-token';
const MOCK_REFRESH_TOKEN = 'mock-refresh-token';
const MOCK_EXP = Math.floor(Date.now() / 1000) + 604800; // 7 days from now

// ─── Mocks ────────────────────────────────────────────────────────────────
const mockUsersService = {
  findByEmail: jest.fn(),
  findByEmailWithPassword: jest.fn(),
  findByUserIdWithPassword: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  createGoogleUser: jest.fn(),
  linkGoogleAccount: jest.fn(),
  verifyEmail: jest.fn(),
  updatePassword: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
  verify: jest.fn(),
  decode: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('test-value'),
  getOrThrow: jest.fn().mockReturnValue('test-value'),
};

const mockAuthRepository = {
  saveRefreshToken: jest.fn(),
  findRefreshToken: jest.fn(),
  deleteRefreshToken: jest.fn(),
  deleteAllUserTokens: jest.fn(),
};

const mockNotificationsService = {
  sendEmailVerification: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
};

const mockRedis = {
  get: jest.fn(),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    _id: new Types.ObjectId(),
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    role: UserRole.USER,
    authProvider: AuthProvider.LOCAL,
    phoneNumber: '01000000000',
    dateOfBirth: new Date('1990-01-01'),
    address: { city: 'Cairo', street: 'Street 1' },
    isEmailVerified: true,
    deletedAt: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * بيضبط الـ mocks اللازمة لـ issueAuthTokens (private helper في الـ service).
 * issueAuthTokens بتنادي:
 *   - jwtService.sign مرتين (access ثم refresh)
 *   - jwtService.decode عشان تستخرج expiresAt من الـ JWT
 *   - authRepository.saveRefreshToken عشان تحفظ الـ token في DB
 *
 * أي test بيتوقع AuthResponse كنتيجة لازم ينادي الدالة دي الأول.
 */
function setupIssueAuthTokensMocks() {
  mockJwtService.sign
    .mockReturnValueOnce(MOCK_ACCESS_TOKEN) // أول sign → access token
    .mockReturnValueOnce(MOCK_REFRESH_TOKEN); // تاني sign → refresh token
  mockJwtService.decode.mockReturnValue({ exp: MOCK_EXP });
  mockAuthRepository.saveRefreshToken.mockResolvedValue(undefined);
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: 'IAuthRepository', useValue: mockAuthRepository },
        { provide: getRedisConnectionToken(), useValue: mockRedis },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── register ─────────────────────────────────────────────────────────────
  describe('register', () => {
    const registerInput = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'Password@123',
      phoneNumber: '01000000000',
      dateOfBirth: new Date('1990-01-01'),
      address: { city: 'Cairo', street: 'Street 1' },
    };

    it('should register a new user and return auth tokens', async () => {
      // Arrange
      const mockUser = createMockUser({ isEmailVerified: false });
      mockUsersService.findByEmail.mockResolvedValue(null);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockUsersService.create.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValueOnce('email-verification-token');
      setupIssueAuthTokensMocks();

      // Act
      const result = await service.register(registerInput);

      // Assert
      expect(result).toEqual({
        accessToken: MOCK_ACCESS_TOKEN,
        refreshToken: MOCK_REFRESH_TOKEN,
        user: mockUser,
      });
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        registerInput.email,
      );
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(
        registerInput.password,
        12,
      );
      expect(mockUsersService.create).toHaveBeenCalled();
      expect(mockNotificationsService.sendEmailVerification).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      // Arrange
      mockUsersService.findByEmail.mockResolvedValue(createMockUser());

      // Act & Assert
      await expect(service.register(registerInput)).rejects.toThrow(
        ConflictException,
      );
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });
  });

  // ─── login ────────────────────────────────────────────────────────────────
  describe('login', () => {
    const loginInput = { email: 'test@example.com', password: 'Password@123' };

    it('should login successfully and return auth tokens', async () => {
      // Arrange
      const mockUser = createMockUser({ password: 'hashed-password' });
      mockUsersService.findByEmailWithPassword.mockResolvedValue(mockUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      setupIssueAuthTokensMocks();

      // Act
      const result = await service.login(loginInput);

      // Assert
      expect(result.accessToken).toBe(MOCK_ACCESS_TOKEN);
      expect(result.refreshToken).toBe(MOCK_REFRESH_TOKEN);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        loginInput.password,
        'hashed-password',
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(null);

      await expect(service.login(loginInput)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if account is soft-deleted', async () => {
      const deletedUser = createMockUser({ deletedAt: new Date() });
      mockUsersService.findByEmailWithPassword.mockResolvedValue(deletedUser);

      await expect(service.login(loginInput)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if account is Google-only (no password)', async () => {
      const googleUser = createMockUser({
        password: undefined,
        authProvider: AuthProvider.GOOGLE,
      });
      mockUsersService.findByEmailWithPassword.mockResolvedValue(googleUser);

      await expect(service.login(loginInput)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw ForbiddenException if email is not verified', async () => {
      const unverifiedUser = createMockUser({
        password: 'hashed',
        isEmailVerified: false,
      });
      mockUsersService.findByEmailWithPassword.mockResolvedValue(
        unverifiedUser,
      );

      await expect(service.login(loginInput)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw UnauthorizedException if password is wrong', async () => {
      const mockUser = createMockUser({ password: 'hashed-password' });
      mockUsersService.findByEmailWithPassword.mockResolvedValue(mockUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginInput)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── googleRegister ───────────────────────────────────────────────────────
  describe('googleRegister', () => {
    const googlePayload = {
      sub: 'google-sub-123',
      email: 'google@example.com',
      email_verified: true,
    };

    const googleRegisterInput = {
      token: 'google-id-token',
      firstName: 'Google',
      lastName: 'User',
      phoneNumber: '01000000001',
      dateOfBirth: new Date('1990-01-01'),
      address: { city: 'Cairo', street: 'Street 1' },
    };

    it('should register a Google user and return auth tokens', async () => {
      // Arrange
      mockVerifyIdToken.mockResolvedValue({ getPayload: () => googlePayload });
      mockUsersService.findByEmail.mockResolvedValue(null);
      const mockUser = createMockUser({ authProvider: AuthProvider.GOOGLE });
      mockUsersService.createGoogleUser.mockResolvedValue(mockUser);
      setupIssueAuthTokensMocks();

      // Act
      const result = await service.googleRegister(googleRegisterInput);

      // Assert
      expect(result.accessToken).toBe(MOCK_ACCESS_TOKEN);
      expect(mockUsersService.createGoogleUser).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if Google token is invalid', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('invalid token'));

      await expect(service.googleRegister(googleRegisterInput)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if Google email is not verified', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({ ...googlePayload, email_verified: false }),
      });

      await expect(service.googleRegister(googleRegisterInput)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw ConflictException if email already registered', async () => {
      mockVerifyIdToken.mockResolvedValue({ getPayload: () => googlePayload });
      mockUsersService.findByEmail.mockResolvedValue(createMockUser());

      await expect(service.googleRegister(googleRegisterInput)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ─── googleLogin ──────────────────────────────────────────────────────────
  describe('googleLogin', () => {
    const googlePayload = {
      sub: 'google-sub-456',
      email: 'google@example.com',
      email_verified: true,
    };

    it('should login with Google and return auth tokens', async () => {
      // Arrange
      mockVerifyIdToken.mockResolvedValue({ getPayload: () => googlePayload });
      const mockUser = createMockUser({
        googleId: 'google-sub-456',
        authProvider: AuthProvider.GOOGLE,
      });
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      setupIssueAuthTokensMocks();

      // Act
      const result = await service.googleLogin({ token: 'google-id-token' });

      // Assert
      expect(result.accessToken).toBe(MOCK_ACCESS_TOKEN);
    });

    it('should throw RegistrationRequiredException if user not found', async () => {
      mockVerifyIdToken.mockResolvedValue({ getPayload: () => googlePayload });
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.googleLogin({ token: 'google-id-token' }),
      ).rejects.toThrow(RegistrationRequiredException);
    });

    it('should throw UnauthorizedException if account is disabled', async () => {
      mockVerifyIdToken.mockResolvedValue({ getPayload: () => googlePayload });
      const deletedUser = createMockUser({ deletedAt: new Date() });
      mockUsersService.findByEmail.mockResolvedValue(deletedUser);

      await expect(
        service.googleLogin({ token: 'google-id-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should link Google account if user exists with LOCAL provider and no googleId', async () => {
      // Arrange
      mockVerifyIdToken.mockResolvedValue({ getPayload: () => googlePayload });
      const localUser = createMockUser({
        googleId: undefined,
        authProvider: AuthProvider.LOCAL,
      });
      const linkedUser = createMockUser({ googleId: 'google-sub-456' });
      mockUsersService.findByEmail.mockResolvedValue(localUser);
      mockUsersService.linkGoogleAccount.mockResolvedValue(linkedUser);
      setupIssueAuthTokensMocks();

      // Act
      await service.googleLogin({ token: 'google-id-token' });

      // Assert
      expect(mockUsersService.linkGoogleAccount).toHaveBeenCalledWith(
        localUser._id.toString(),
        'google-sub-456',
      );
    });
  });

  // ─── confirmEmail ─────────────────────────────────────────────────────────
  describe('confirmEmail', () => {
    it('should verify email and return true', async () => {
      // Arrange
      const userId = new Types.ObjectId().toString();
      mockJwtService.verify.mockReturnValue({ sub: userId });
      mockUsersService.verifyEmail.mockResolvedValue(undefined);

      // Act
      const result = await service.confirmEmail('valid-token');

      // Assert
      expect(result).toBe(true);
      expect(mockUsersService.verifyEmail).toHaveBeenCalledWith(userId);
    });

    it('should throw BadRequestException if token is invalid or expired', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(service.confirmEmail('invalid-token')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── resendConfirmationEmail ───────────────────────────────────────────────
  describe('resendConfirmationEmail', () => {
    it('should return true silently if email does not exist (security — no info leak)', async () => {
      // Arrange
      mockUsersService.findByEmail.mockResolvedValue(null);

      // Act
      const result = await service.resendConfirmationEmail(
        'unknown@example.com',
      );

      // Assert — لا نكشف للمهاجم إن الإيميل مش موجود
      expect(result).toBe(true);
      expect(
        mockNotificationsService.sendEmailVerification,
      ).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if email is already verified', async () => {
      mockUsersService.findByEmail.mockResolvedValue(
        createMockUser({ isEmailVerified: true }),
      );

      await expect(
        service.resendConfirmationEmail('test@example.com'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should send verification email and return true', async () => {
      // Arrange
      const unverifiedUser = createMockUser({ isEmailVerified: false });
      mockUsersService.findByEmail.mockResolvedValue(unverifiedUser);
      mockJwtService.sign.mockReturnValue('new-verification-token');

      // Act
      const result = await service.resendConfirmationEmail('test@example.com');

      // Assert
      expect(result).toBe(true);
      expect(mockNotificationsService.sendEmailVerification).toHaveBeenCalled();
    });
  });

  // ─── logout ───────────────────────────────────────────────────────────────
  describe('logout', () => {
    it('should hash the refresh token and delete it from DB', async () => {
      // Arrange
      const rawToken = 'raw-refresh-token';
      const expectedHash = createHash('sha256').update(rawToken).digest('hex');
      mockAuthRepository.deleteRefreshToken.mockResolvedValue(undefined);

      // Act
      const result = await service.logout(rawToken);

      // Assert
      expect(result).toBe(true);
      // نتأكد إن الـ raw token ما بيُبعتش للـ DB — بس الـ hash
      expect(mockAuthRepository.deleteRefreshToken).toHaveBeenCalledWith(
        expectedHash,
      );
    });
  });

  // ─── logoutAll ────────────────────────────────────────────────────────────
  describe('logoutAll', () => {
    it('should delete all user tokens and return true', async () => {
      // Arrange
      const userId = new Types.ObjectId().toString();
      mockAuthRepository.deleteAllUserTokens.mockResolvedValue(undefined);

      // Act
      const result = await service.logoutAll(userId);

      // Assert
      expect(result).toBe(true);
      expect(mockAuthRepository.deleteAllUserTokens).toHaveBeenCalledWith(
        userId,
      );
    });
  });

  // ─── refreshTokens ────────────────────────────────────────────────────────
  describe('refreshTokens', () => {
    // بنحسب الـ hash هنا زي ما بيعملها الـ service بالظبط
    const rawRefreshToken = 'raw-refresh-token-string';
    const hashedToken = createHash('sha256')
      .update(rawRefreshToken)
      .digest('hex');

    it('should rotate refresh token and return new auth tokens', async () => {
      // Arrange
      const userId = new Types.ObjectId().toString();
      const jwtPayload = {
        sub: userId,
        email: 'test@example.com',
        role: UserRole.USER,
      };
      const mockUser = createMockUser();

      mockAuthRepository.findRefreshToken.mockResolvedValue({ hashedToken });
      mockJwtService.verify.mockReturnValue(jwtPayload);
      mockAuthRepository.deleteRefreshToken.mockResolvedValue(undefined);
      mockUsersService.findById.mockResolvedValue(mockUser);
      setupIssueAuthTokensMocks();

      // Act
      const result = await service.refreshTokens(rawRefreshToken);

      // Assert
      expect(result.accessToken).toBe(MOCK_ACCESS_TOKEN);
      expect(result.refreshToken).toBe(MOCK_REFRESH_TOKEN);
      // Token Rotation: الـ old token لازم يتمسح قبل إصدار الجديد
      expect(mockAuthRepository.deleteRefreshToken).toHaveBeenCalledWith(
        hashedToken,
      );
      expect(mockAuthRepository.findRefreshToken).toHaveBeenCalledWith(
        hashedToken,
      );
    });

    it('should throw UnauthorizedException if token not found in DB', async () => {
      mockAuthRepository.findRefreshToken.mockResolvedValue(null);

      await expect(service.refreshTokens(rawRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should delete expired token and throw UnauthorizedException', async () => {
      // Arrange — الـ token موجود في DB لكن الـ JWT signature منتهية
      mockAuthRepository.findRefreshToken.mockResolvedValue({ hashedToken });
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });
      mockAuthRepository.deleteRefreshToken.mockResolvedValue(undefined);

      // Act & Assert
      await expect(service.refreshTokens(rawRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      // الـ token لازم يتمسح من الـ DB حتى لو الـ JWT منتهي
      expect(mockAuthRepository.deleteRefreshToken).toHaveBeenCalledWith(
        hashedToken,
      );
    });

    it('should throw UnauthorizedException if user is disabled', async () => {
      // Arrange — اليوزر موجود لكن deletedAt مش null
      const userId = new Types.ObjectId().toString();
      mockAuthRepository.findRefreshToken.mockResolvedValue({ hashedToken });
      mockJwtService.verify.mockReturnValue({
        sub: userId,
        email: 'test@example.com',
        role: UserRole.USER,
      });
      mockAuthRepository.deleteRefreshToken.mockResolvedValue(undefined);
      mockUsersService.findById.mockResolvedValue(
        createMockUser({ deletedAt: new Date() }),
      );

      await expect(service.refreshTokens(rawRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── forgotPassword ───────────────────────────────────────────────────────
  describe('forgotPassword', () => {
    const forgotInput = { email: 'test@example.com' };
    const ip = '127.0.0.1';
    const browser = 'Mozilla/5.0';

    it('should return true silently if user not found (security)', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(null);

      const result = await service.forgotPassword(forgotInput, ip, browser);

      expect(result).toBe(true);
      expect(
        mockNotificationsService.sendPasswordResetEmail,
      ).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if account has no password (Google-only)', async () => {
      const googleUser = createMockUser({ password: undefined });
      mockUsersService.findByEmailWithPassword.mockResolvedValue(googleUser);

      await expect(
        service.forgotPassword(forgotInput, ip, browser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return true silently if user already requested within 2 minutes (rate limit)', async () => {
      // Arrange
      const mockUser = createMockUser({ password: 'hashed' });
      mockUsersService.findByEmailWithPassword.mockResolvedValue(mockUser);
      mockRedis.get.mockResolvedValue('1'); // الـ rate limit key موجود في Redis

      // Act
      const result = await service.forgotPassword(forgotInput, ip, browser);

      // Assert — مش بيبعت إيميل تاني
      expect(result).toBe(true);
      expect(
        mockNotificationsService.sendPasswordResetEmail,
      ).not.toHaveBeenCalled();
    });

    it('should send reset email, set rate limit & token in Redis, then return true', async () => {
      // Arrange
      const mockUser = createMockUser({ password: 'hashed' });
      mockUsersService.findByEmailWithPassword.mockResolvedValue(mockUser);
      mockRedis.get.mockResolvedValue(null); // مفيش rate limit

      // Act
      const result = await service.forgotPassword(forgotInput, ip, browser);

      // Assert
      expect(result).toBe(true);
      // بيعمل set مرتين: rate limit key + reset token key
      expect(mockRedis.set).toHaveBeenCalledTimes(2);
      expect(
        mockNotificationsService.sendPasswordResetEmail,
      ).toHaveBeenCalledWith(
        mockUser.email,
        expect.any(String), // rawToken (random)
        { firstName: mockUser.firstName, lastName: mockUser.lastName },
        { ip, browser, time: expect.any(String) as string },
      );
    });
  });

  // ─── resetPassword ────────────────────────────────────────────────────────
  describe('resetPassword', () => {
    // بنحسب الـ hash زي ما بيعمله الـ service بالظبط للمقارنة
    const rawToken = 'raw-reset-token';
    const hashedToken = createHash('sha256').update(rawToken).digest('hex');

    const resetInput = {
      email: 'test@example.com',
      token: rawToken,
      password: 'NewPassword@123',
    };

    it('should reset password and logout all sessions', async () => {
      // Arrange
      const mockUser = createMockUser({ password: 'old-hashed' });
      mockUsersService.findByEmailWithPassword.mockResolvedValue(mockUser);
      mockRedis.get.mockResolvedValue(hashedToken);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      mockUsersService.updatePassword.mockResolvedValue(undefined);
      mockRedis.del.mockResolvedValue(1);
      mockAuthRepository.deleteAllUserTokens.mockResolvedValue(undefined);

      // Act
      const result = await service.resetPassword(resetInput);

      // Assert
      expect(result).toBe(true);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(resetInput.password, 12);
      expect(mockUsersService.updatePassword).toHaveBeenCalledWith(
        mockUser._id.toString(),
        'new-hashed-password',
      );
      // مسح الـ token من Redis بعد الاستخدام
      expect(mockRedis.del).toHaveBeenCalled();
      // طرد اليوزر من كل الأجهزة بعد تغيير الباسورد
      expect(mockAuthRepository.deleteAllUserTokens).toHaveBeenCalled();
    });

    it('should throw BadRequestException if user not found', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(null);

      await expect(service.resetPassword(resetInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if no token stored in Redis', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(
        createMockUser(),
      );
      mockRedis.get.mockResolvedValue(null);

      await expect(service.resetPassword(resetInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if token does not match stored hash', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(
        createMockUser(),
      );
      mockRedis.get.mockResolvedValue('completely-different-hash');

      await expect(service.resetPassword(resetInput)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── updatePassword ───────────────────────────────────────────────────────
  describe('updatePassword', () => {
    const userId = new Types.ObjectId().toString();
    const updateInput = { oldPassword: 'OldPass@123', password: 'NewPass@123' };

    it('should update password and logout all sessions', async () => {
      // Arrange
      const mockUser = createMockUser({ password: 'old-hashed' });
      mockUsersService.findByUserIdWithPassword.mockResolvedValue(mockUser);
      (mockedBcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true) // old password صح
        .mockResolvedValueOnce(false); // الباسورد الجديد مختلف عن القديم
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      mockUsersService.updatePassword.mockResolvedValue(undefined);
      mockAuthRepository.deleteAllUserTokens.mockResolvedValue(undefined);

      // Act
      const result = await service.updatePassword(userId, updateInput);

      // Assert
      expect(result).toBe(true);
      expect(mockUsersService.updatePassword).toHaveBeenCalledWith(
        userId,
        'new-hashed-password',
      );
      // logout من كل الأجهزة بعد تغيير الباسورد
      expect(mockAuthRepository.deleteAllUserTokens).toHaveBeenCalledWith(
        mockUser._id.toString(),
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.findByUserIdWithPassword.mockResolvedValue(null);

      await expect(service.updatePassword(userId, updateInput)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw BadRequestException if account has no password (Google-only)', async () => {
      mockUsersService.findByUserIdWithPassword.mockResolvedValue(
        createMockUser({ password: undefined }),
      );

      await expect(service.updatePassword(userId, updateInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if old password is wrong', async () => {
      mockUsersService.findByUserIdWithPassword.mockResolvedValue(
        createMockUser({ password: 'hashed' }),
      );
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.updatePassword(userId, updateInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if new password is the same as old password', async () => {
      mockUsersService.findByUserIdWithPassword.mockResolvedValue(
        createMockUser({ password: 'hashed' }),
      );
      (mockedBcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true) // old password صح
        .mockResolvedValueOnce(true); // الباسورد الجديد نفس القديم

      await expect(service.updatePassword(userId, updateInput)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
