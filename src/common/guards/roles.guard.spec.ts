import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new RolesGuard(reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockContext = (user?: JwtPayload) => {
    return {
      getType: jest.fn().mockReturnValue('graphql'),
      getArgs: jest
        .fn()
        .mockReturnValue([{}, {}, { req: { user } }, { parentType: 'query' }]),
      getHandler: jest.fn().mockReturnValue('handler'),
      getClass: jest.fn().mockReturnValue('class'),
      getArgByIndex: jest.fn(),
    } as unknown as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should return true if no roles are required for the route', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const mockContext = createMockContext();

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        'handler',
        'class',
      ]);
    });

    it('should return false if there is no user in the context', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const mockContext = createMockContext(undefined); // No user

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true if the user has the required role', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const user: JwtPayload = {
        sub: 'id',
        email: 'test@example.com',
        role: UserRole.ADMIN,
      };
      const mockContext = createMockContext(user);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false if the user does not have the required role', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const user: JwtPayload = {
        sub: 'id',
        email: 'test@example.com',
        role: UserRole.USER, // Has USER role, needs ADMIN
      };
      const mockContext = createMockContext(user);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true if the route allows multiple roles and user has one of them', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue([
        UserRole.USER,
        UserRole.ADMIN,
      ]);
      const user: JwtPayload = {
        sub: 'id',
        email: 'test@example.com',
        role: UserRole.USER,
      };
      const mockContext = createMockContext(user);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });
  });
});
