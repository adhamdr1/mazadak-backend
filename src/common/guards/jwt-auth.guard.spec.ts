import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../../users/enums/user-role.enum';

jest.mock('@nestjs/graphql', () => {
  const original =
    jest.requireActual<typeof import('@nestjs/graphql')>('@nestjs/graphql');
  return {
    ...original,
    GqlExecutionContext: {
      create: jest.fn(),
    },
  };
});

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new JwtAuthGuard(reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true if the route is marked as public', async () => {
      const mockContext = {
        getHandler: jest.fn().mockReturnValue('handler'),
        getClass: jest.fn().mockReturnValue('class'),
        getType: jest.fn().mockReturnValue('http'),
      } as unknown as ExecutionContext;

      reflector.getAllAndOverride.mockReturnValue(true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        'handler',
        'class',
      ]);
    });

    it('should authenticate websocket subscription if gqlCtx.user exists', async () => {
      const mockUser: JwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: UserRole.USER,
      };
      const mockReq = { headers: {} };
      const mockGqlCtx = {
        getContext: jest.fn().mockReturnValue({
          user: mockUser,
          req: mockReq,
        }),
      };

      (
        GqlExecutionContext.create as jest.MockedFunction<
          typeof GqlExecutionContext.create
        >
      ).mockReturnValue(
        mockGqlCtx as unknown as ReturnType<typeof GqlExecutionContext.create>,
      );

      const mockContext = {
        getHandler: jest.fn().mockReturnValue('handler'),
        getClass: jest.fn().mockReturnValue('class'),
        getType: jest.fn().mockReturnValue('graphql'),
      } as unknown as ExecutionContext;

      reflector.getAllAndOverride.mockReturnValue(false);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockReq).toEqual({ headers: {}, user: mockUser });
    });

    it('should return false for graphql context with no headers and no user', async () => {
      const mockGqlCtx = {
        getContext: jest.fn().mockReturnValue({
          req: {},
        }),
      };

      (
        GqlExecutionContext.create as jest.MockedFunction<
          typeof GqlExecutionContext.create
        >
      ).mockReturnValue(
        mockGqlCtx as unknown as ReturnType<typeof GqlExecutionContext.create>,
      );

      const mockContext = {
        getHandler: jest.fn().mockReturnValue('handler'),
        getClass: jest.fn().mockReturnValue('class'),
        getType: jest.fn().mockReturnValue('graphql'),
      } as unknown as ExecutionContext;

      reflector.getAllAndOverride.mockReturnValue(false);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(false);
    });

    it('should call super.canActivate if route is not public and http request with headers is present', async () => {
      const mockContext = {
        getHandler: jest.fn().mockReturnValue('handler'),
        getClass: jest.fn().mockReturnValue('class'),
        getType: jest.fn().mockReturnValue('http'),
      } as unknown as ExecutionContext;

      reflector.getAllAndOverride.mockReturnValue(false);

      const superCanActivateSpy = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockResolvedValue(true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(superCanActivateSpy).toHaveBeenCalledWith(mockContext);
    });
  });

  describe('getRequest', () => {
    it('should return req for graphql context when headers exist', () => {
      const mockReq = { headers: { authorization: 'Bearer token' } };
      const mockGqlCtx = {
        getContext: jest.fn().mockReturnValue({
          req: mockReq,
        }),
      };

      (
        GqlExecutionContext.create as jest.MockedFunction<
          typeof GqlExecutionContext.create
        >
      ).mockReturnValue(
        mockGqlCtx as unknown as ReturnType<typeof GqlExecutionContext.create>,
      );

      const mockContext = {
        getType: jest.fn().mockReturnValue('graphql'),
      } as unknown as ExecutionContext;

      const result = guard.getRequest(mockContext);

      expect(result).toBe(mockReq);
    });

    it('should return empty object for graphql context when headers do not exist', () => {
      const mockGqlCtx = {
        getContext: jest.fn().mockReturnValue({
          req: undefined,
        }),
      };

      (
        GqlExecutionContext.create as jest.MockedFunction<
          typeof GqlExecutionContext.create
        >
      ).mockReturnValue(
        mockGqlCtx as unknown as ReturnType<typeof GqlExecutionContext.create>,
      );

      const mockContext = {
        getType: jest.fn().mockReturnValue('graphql'),
      } as unknown as ExecutionContext;

      const result = guard.getRequest(mockContext);

      expect(result).toEqual({});
    });

    it('should return http request for non-graphql context', () => {
      const mockReq = { headers: { authorization: 'Bearer token' } };
      const mockHttpArgumentsHost = {
        getRequest: jest.fn().mockReturnValue(mockReq),
      };
      const mockContext = {
        getType: jest.fn().mockReturnValue('http'),
        switchToHttp: jest.fn().mockReturnValue(mockHttpArgumentsHost),
      } as unknown as ExecutionContext;

      const result = guard.getRequest(mockContext);

      expect(result).toBe(mockReq);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockContext.switchToHttp).toHaveBeenCalled();
    });
  });
});
