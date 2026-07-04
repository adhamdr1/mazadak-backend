import { Test, TestingModule } from '@nestjs/testing';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';
import { Types } from 'mongoose';
import { UserRole } from './entities/user.entity';

// 1. Mock لـ UsersService (يحتوي على كل الدوال التي يستدعيها الـ Resolver)
const mockUsersService = {
  findById: jest.fn(),
  findAll: jest.fn(),
  updateProfile: jest.fn(),
  softDelete: jest.fn(),
};

describe('UsersResolver', () => {
  let resolver: UsersResolver;

  // متغيرات ثابتة سنستخدمها في كل الاختبارات
  const currentUserId = new Types.ObjectId().toString();
  const otherUserId = new Types.ObjectId().toString();

  const currentUserPayload = {
    sub: currentUserId,
    role: UserRole.USER,
    email: 'user@example.com',
  };

  const adminUserPayload = {
    sub: currentUserId,
    role: UserRole.ADMIN,
    email: 'admin@example.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersResolver,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    resolver = module.get<UsersResolver>(UsersResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  // 2. اختبار دالة me
  describe('me', () => {
    it('should return the current user profile', async () => {
      const expectedUser = { _id: currentUserId, firstName: 'Test' };
      mockUsersService.findById.mockResolvedValue(expectedUser);

      const result = await resolver.me(currentUserPayload);

      expect(result).toEqual(expectedUser);
      expect(mockUsersService.findById).toHaveBeenCalledWith(currentUserId);
    });
  });

  // 3. اختبار دالة findUser (Admin)
  describe('findUser', () => {
    it('should return a user by id', async () => {
      const expectedUser = { _id: otherUserId, firstName: 'Other' };
      mockUsersService.findById.mockResolvedValue(expectedUser);

      const result = await resolver.findUser({ id: otherUserId });

      expect(result).toEqual(expectedUser);
      expect(mockUsersService.findById).toHaveBeenCalledWith(otherUserId);
    });
  });

  // 4. اختبار دالة findAll (Admin)
  describe('findAll', () => {
    it('should return paginated users', async () => {
      const expectedUsers = [{ _id: currentUserId, firstName: 'Test' }];
      mockUsersService.findAll.mockResolvedValue(expectedUsers);

      const paginationInput = { page: 1, limit: 10 };
      const result = await resolver.findAll(paginationInput);

      expect(result).toEqual(expectedUsers);
      expect(mockUsersService.findAll).toHaveBeenCalledWith(paginationInput);
    });
  });

  // 5. اختبار دالة updateProfile (User)
  describe('updateProfile', () => {
    it('should update and return the current user profile', async () => {
      const updateInput = { firstName: 'Updated' };
      const expectedUser = { _id: currentUserId, firstName: 'Updated' };
      mockUsersService.updateProfile.mockResolvedValue(expectedUser);

      const result = await resolver.updateProfile(
        currentUserPayload,
        updateInput,
      );

      expect(result).toEqual(expectedUser);

      // نتأكد أنه مرر الـ ID الخاص بالمستخدم الحالي
      expect(mockUsersService.updateProfile).toHaveBeenCalledWith(
        currentUserPayload,
        currentUserId,
        updateInput,
      );
    });
  });

  // 6. اختبار دالة deleteAccount (User)
  describe('deleteAccount', () => {
    it('should delete the current user account and return true', async () => {
      mockUsersService.softDelete.mockResolvedValue(undefined);

      const result = await resolver.deleteAccount(currentUserPayload);

      expect(result).toBe(true);
      expect(mockUsersService.softDelete).toHaveBeenCalledWith(
        currentUserPayload,
        currentUserId,
      );
    });
  });

  // 7. اختبار دالة adminUpdateUser (Admin)
  describe('adminUpdateUser', () => {
    it('should update another user and return the profile', async () => {
      const updateInput = { firstName: 'Admin Updated' };
      const expectedUser = { _id: otherUserId, firstName: 'Admin Updated' };
      mockUsersService.updateProfile.mockResolvedValue(expectedUser);

      const result = await resolver.adminUpdateUser(
        adminUserPayload,
        { id: otherUserId },
        updateInput,
      );

      expect(result).toEqual(expectedUser);
      expect(mockUsersService.updateProfile).toHaveBeenCalledWith(
        adminUserPayload,
        otherUserId, // تم تمرير الـ ID الخاص بالمستخدم المستهدف
        updateInput,
      );
    });
  });

  // 8. اختبار دالة adminDeleteUser (Admin)
  describe('adminDeleteUser', () => {
    it('should delete another user account and return true', async () => {
      mockUsersService.softDelete.mockResolvedValue(undefined);

      const result = await resolver.adminDeleteUser(adminUserPayload, {
        id: otherUserId,
      });

      expect(result).toBe(true);
      expect(mockUsersService.softDelete).toHaveBeenCalledWith(
        adminUserPayload,
        otherUserId, // تم تمرير الـ ID الخاص بالمستخدم المستهدف
      );
    });
  });
});
