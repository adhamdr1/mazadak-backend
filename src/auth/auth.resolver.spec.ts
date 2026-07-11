import { Test, TestingModule } from '@nestjs/testing';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { RegisterInput } from './dto/register.input';
import { LoginInput } from './dto/login.input';
import { GoogleRegisterInput } from './dto/google-register.input';
import { GoogleLoginInput } from './dto/google-login.input';
import { ForgotPasswordInput } from './dto/forgot-password.input';
import { ResetPasswordInput } from './dto/reset-password.input';
import { UpdatePasswordInput } from './dto/update-password.input';
import { UserRole } from '../users/enums/user-role.enum';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { User } from '../users/entities/user.entity';
import type { Request } from 'express';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  googleRegister: jest.fn(),
  googleLogin: jest.fn(),
  confirmEmail: jest.fn(),
  resendConfirmationEmail: jest.fn(),
  refreshTokens: jest.fn(),
  logout: jest.fn(),
  logoutAll: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  updatePassword: jest.fn(),
};

describe('AuthResolver', () => {
  let resolver: AuthResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthResolver,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    resolver = module.get<AuthResolver>(AuthResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('health', () => {
    it('should return "API is running"', () => {
      expect(resolver.health()).toBe('API is running');
    });
  });

  describe('register', () => {
    it('should call authService.register and return the result', async () => {
      const input: RegisterInput = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'Password@123',
        phoneNumber: '01000000000',
        dateOfBirth: new Date('1990-01-01'),
        address: { city: 'Cairo', street: 'Street 1' },
      };
      const expectedResponse = {
        accessToken: 'access',
        refreshToken: 'refresh',
        user: {} as unknown as User,
      };
      mockAuthService.register.mockResolvedValue(expectedResponse);

      const result = await resolver.register(input);

      expect(result).toEqual(expectedResponse);
      expect(mockAuthService.register).toHaveBeenCalledWith(input);
    });
  });

  describe('login', () => {
    it('should call authService.login and return the result', async () => {
      const input: LoginInput = {
        email: 'test@example.com',
        password: 'Password@123',
      };
      const expectedResponse = {
        accessToken: 'access',
        refreshToken: 'refresh',
        user: {} as unknown as User,
      };
      mockAuthService.login.mockResolvedValue(expectedResponse);

      const result = await resolver.login(input);

      expect(result).toEqual(expectedResponse);
      expect(mockAuthService.login).toHaveBeenCalledWith(input);
    });
  });

  describe('googleRegister', () => {
    it('should call authService.googleRegister and return the result', async () => {
      const input: GoogleRegisterInput = {
        token: 'google-token',
        firstName: 'Google',
        lastName: 'User',
        phoneNumber: '01000000001',
        dateOfBirth: new Date('1990-01-01'),
        address: { city: 'Cairo', street: 'Street 1' },
      };
      const expectedResponse = {
        accessToken: 'access',
        refreshToken: 'refresh',
        user: {} as unknown as User,
      };
      mockAuthService.googleRegister.mockResolvedValue(expectedResponse);

      const result = await resolver.googleRegister(input);

      expect(result).toEqual(expectedResponse);
      expect(mockAuthService.googleRegister).toHaveBeenCalledWith(input);
    });
  });

  describe('googleLogin', () => {
    it('should call authService.googleLogin and return the result', async () => {
      const input: GoogleLoginInput = { token: 'google-token' };
      const expectedResponse = {
        accessToken: 'access',
        refreshToken: 'refresh',
        user: {} as unknown as User,
      };
      mockAuthService.googleLogin.mockResolvedValue(expectedResponse);

      const result = await resolver.googleLogin(input);

      expect(result).toEqual(expectedResponse);
      expect(mockAuthService.googleLogin).toHaveBeenCalledWith(input);
    });
  });

  describe('confirmEmail', () => {
    it('should call authService.confirmEmail and return the result', async () => {
      mockAuthService.confirmEmail.mockResolvedValue(true);

      const result = await resolver.confirmEmail('valid-token');

      expect(result).toBe(true);
      expect(mockAuthService.confirmEmail).toHaveBeenCalledWith('valid-token');
    });
  });

  describe('resendConfirmationEmail', () => {
    it('should call authService.resendConfirmationEmail and return the result', async () => {
      mockAuthService.resendConfirmationEmail.mockResolvedValue(true);

      const result = await resolver.resendConfirmationEmail('test@example.com');

      expect(result).toBe(true);
      expect(mockAuthService.resendConfirmationEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
    });
  });

  describe('refreshToken', () => {
    it('should call authService.refreshTokens and return the result', async () => {
      const expectedResponse = {
        accessToken: 'access',
        refreshToken: 'refresh',
        user: {} as unknown as User,
      };
      mockAuthService.refreshTokens.mockResolvedValue(expectedResponse);

      const result = await resolver.refreshToken('refresh-token');

      expect(result).toEqual(expectedResponse);
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(
        'refresh-token',
      );
    });
  });

  describe('logout', () => {
    it('should call authService.logout and return the result', async () => {
      mockAuthService.logout.mockResolvedValue(true);

      const result = await resolver.logout('refresh-token');

      expect(result).toBe(true);
      expect(mockAuthService.logout).toHaveBeenCalledWith('refresh-token');
    });
  });

  describe('logoutAll', () => {
    it('should call authService.logoutAll with user.sub and return the result', async () => {
      const user: JwtPayload = {
        sub: 'user-id',
        email: 'test@example.com',
        role: UserRole.USER,
      };
      mockAuthService.logoutAll.mockResolvedValue(true);

      const result = await resolver.logoutAll(user);

      expect(result).toBe(true);
      expect(mockAuthService.logoutAll).toHaveBeenCalledWith('user-id');
    });
  });

  describe('forgotPassword', () => {
    it('should extract ip and browser from req and call authService.forgotPassword', async () => {
      const input: ForgotPasswordInput = { email: 'test@example.com' };
      const req = {
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
      } as unknown as Request;
      mockAuthService.forgotPassword.mockResolvedValue(true);

      const result = await resolver.forgotPassword(input, { req });

      expect(result).toBe(true);
      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(
        input,
        '127.0.0.1',
        'Mozilla/5.0',
      );
    });

    it('should provide default ip and browser if req is missing them', async () => {
      const input: ForgotPasswordInput = { email: 'test@example.com' };
      const req = { headers: {} } as unknown as Request; // No ip, no socket, no user-agent
      mockAuthService.forgotPassword.mockResolvedValue(true);

      const result = await resolver.forgotPassword(input, { req });

      expect(result).toBe(true);
      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(
        input,
        'Unknown IP',
        'Unknown Browser',
      );
    });
  });

  describe('resetPassword', () => {
    it('should call authService.resetPassword and return the result', async () => {
      const input: ResetPasswordInput = {
        email: 'test@example.com',
        token: 'token',
        password: 'NewPassword@123',
      };
      mockAuthService.resetPassword.mockResolvedValue(true);

      const result = await resolver.resetPassword(input);

      expect(result).toBe(true);
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(input);
    });
  });

  describe('updatePassword', () => {
    it('should call authService.updatePassword with user.sub and return the result', async () => {
      const input: UpdatePasswordInput = {
        oldPassword: 'OldPassword@123',
        password: 'NewPassword@123',
      };
      const user: JwtPayload = {
        sub: 'user-id',
        email: 'test@example.com',
        role: UserRole.USER,
      };
      mockAuthService.updatePassword.mockResolvedValue(true);

      const result = await resolver.updatePassword(user, input);

      expect(result).toBe(true);
      expect(mockAuthService.updatePassword).toHaveBeenCalledWith(
        'user-id',
        input,
      );
    });
  });
});
