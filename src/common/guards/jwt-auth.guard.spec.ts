import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

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
    it('should return true if the route is marked as public', () => {
      // Arrange
      const mockContext = {
        getHandler: jest.fn().mockReturnValue('handler'),
        getClass: jest.fn().mockReturnValue('class'),
      } as unknown as ExecutionContext;

      reflector.getAllAndOverride.mockReturnValue(true);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        'handler',
        'class',
      ]);
    });

    it('should call super.canActivate if the route is not public', () => {
      // Arrange
      const mockContext = {
        getHandler: jest.fn().mockReturnValue('handler'),
        getClass: jest.fn().mockReturnValue('class'),
      } as unknown as ExecutionContext;

      reflector.getAllAndOverride.mockReturnValue(false);

      // بنعمل mock للـ super.canActivate عشان ميعملش call فعلي للـ passport
      const superCanActivateSpy = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue('super-result');

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe('super-result');
      expect(superCanActivateSpy).toHaveBeenCalledWith(mockContext);
    });
  });
});
