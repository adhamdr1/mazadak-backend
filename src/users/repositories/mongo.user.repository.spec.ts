import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types, Model } from 'mongoose';
import { MongoUserRepository } from './mongo.user.repository';
import { User, UserDocument } from '../entities/user.entity';
import { UserRole } from '../enums/user-role.enum';
import { AuthProvider } from '../enums/auth-provider.enum';

describe('MongoUserRepository', () => {
  let repository: MongoUserRepository;

  const mockExec = jest.fn();

  const mockQueryChain = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: mockExec,
  };

  const mockUserModel = {
    find: jest.fn(),
    countDocuments: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
    db: {
      startSession: jest.fn(),
    },
  } as unknown as Model<UserDocument> & {
    find: jest.Mock;
    countDocuments: jest.Mock;
    findOne: jest.Mock;
    findById: jest.Mock;
    findOneAndUpdate: jest.Mock;
  };

  Object.assign(mockUserModel, {
    find: jest.fn().mockReturnValue(mockQueryChain),
    countDocuments: jest.fn().mockReturnValue({ exec: mockExec }),
  });

  const mockUser: User = {
    _id: new Types.ObjectId(),
    email: 'adham@example.com',
    firstName: 'Adham',
    lastName: 'Mohamed',
    role: UserRole.USER,
    authProvider: AuthProvider.LOCAL,
    phoneNumber: '01507412345',
    dateOfBirth: new Date('1995-01-01'),
    address: { city: 'Cairo', street: 'Tahrir' },
    isEmailVerified: true,
    isBanned: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockExec.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongoUserRepository,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    repository = module.get<MongoUserRepository>(MongoUserRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findAll', () => {
    it('should query with deletedAt: null and default sort when no filter is provided', async () => {
      mockExec.mockResolvedValueOnce([mockUser]).mockResolvedValueOnce(1);

      const result = await repository.findAll(1, 10);

      expect(mockUserModel.find).toHaveBeenCalledWith({ deletedAt: null });
      expect(mockQueryChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockQueryChain.skip).toHaveBeenCalledWith(0);
      expect(mockQueryChain.limit).toHaveBeenCalledWith(10);
      expect(result).toEqual({ items: [mockUser], total: 1 });
    });

    it('should build case-insensitive safe regex $or conditions when search is provided', async () => {
      mockExec.mockResolvedValueOnce([mockUser]).mockResolvedValueOnce(1);

      await repository.findAll(1, 10, { search: 'adham' });

      const calls = mockUserModel.find.mock.calls as Array<
        [Record<string, unknown>]
      >;
      const query = calls[0]?.[0];
      expect(query?.deletedAt).toBeNull();
      const orList = query?.$or as Array<Record<string, unknown>>;
      expect(Array.isArray(orList)).toBe(true);
      expect(orList[0]).toEqual({ firstName: { $regex: /adham/i } });
      expect(orList[1]).toEqual({ lastName: { $regex: /adham/i } });
      expect(orList[2]).toEqual({ email: { $regex: /adham/i } });
      expect(orList[3]).toEqual({ phoneNumber: { $regex: /adham/i } });
    });

    it('should match phone numbers or partial prefixes seamlessly', async () => {
      mockExec.mockResolvedValueOnce([mockUser]).mockResolvedValueOnce(1);

      await repository.findAll(1, 10, { search: '015074' });

      const calls = mockUserModel.find.mock.calls as Array<
        [Record<string, unknown>]
      >;
      const query = calls[0]?.[0];
      const orList = query?.$or as Array<Record<string, unknown>>;
      expect(Array.isArray(orList)).toBe(true);
      expect(orList[3]).toEqual({ phoneNumber: { $regex: /015074/i } });
    });

    it('should safely escape special regex characters without crashing or ReDoS vulnerability', async () => {
      mockExec.mockResolvedValueOnce([]).mockResolvedValueOnce(0);

      await repository.findAll(1, 10, { search: 'test+user.*(cairo)?' });

      const calls = mockUserModel.find.mock.calls as Array<
        [Record<string, unknown>]
      >;
      const query = calls[0]?.[0];
      const orList = query?.$or as Array<Record<string, unknown>>;
      expect(Array.isArray(orList)).toBe(true);
      const emailCondition = orList[2];
      const regexRecord = emailCondition?.email as { $regex: RegExp };
      expect(regexRecord.$regex.source).toContain(
        'test\\+user\\.\\*\\(cairo\\)\\?',
      );
    });

    it('should support multi-word search for combined firstName and lastName', async () => {
      mockExec.mockResolvedValueOnce([mockUser]).mockResolvedValueOnce(1);

      await repository.findAll(1, 10, { search: 'Adham Mohamed' });

      const calls = mockUserModel.find.mock.calls as Array<
        [Record<string, unknown>]
      >;
      const query = calls[0]?.[0];
      const orList = query?.$or as Array<Record<string, unknown>>;
      expect(Array.isArray(orList)).toBe(true);
      expect(orList.length).toBeGreaterThanOrEqual(6);
      expect(orList[4]).toEqual({
        $and: [
          { firstName: { $regex: /Adham/i } },
          { lastName: { $regex: /Mohamed/i } },
        ],
      });
      expect(orList[5]).toEqual({
        $and: [
          { firstName: { $regex: /Mohamed/i } },
          { lastName: { $regex: /Adham/i } },
        ],
      });
    });

    it('should include _id in $or when search is a valid ObjectId', async () => {
      const validId = new Types.ObjectId().toString();
      mockExec.mockResolvedValueOnce([mockUser]).mockResolvedValueOnce(1);

      await repository.findAll(1, 10, { search: validId });

      const calls = mockUserModel.find.mock.calls as Array<
        [Record<string, unknown>]
      >;
      const query = calls[0]?.[0];
      const orList = query?.$or as Array<Record<string, unknown>>;
      expect(Array.isArray(orList)).toBe(true);
      expect(orList[4]).toEqual({ _id: new Types.ObjectId(validId) });
    });

    it('should combine search with role, isBanned, and isEmailVerified filters', async () => {
      mockExec.mockResolvedValueOnce([mockUser]).mockResolvedValueOnce(1);

      await repository.findAll(1, 10, {
        search: 'ahmed',
        role: UserRole.USER,
        isBanned: false,
        isEmailVerified: true,
      });

      const calls = mockUserModel.find.mock.calls as Array<
        [Record<string, unknown>]
      >;
      const query = calls[0]?.[0];
      expect(query?.deletedAt).toBeNull();
      expect(query?.role).toBe(UserRole.USER);
      expect(query?.isBanned).toBe(false);
      expect(query?.isEmailVerified).toBe(true);
      expect(Array.isArray(query?.$or)).toBe(true);
    });
  });

  describe('countAll', () => {
    it('should apply the same safe search regex filter when counting', async () => {
      mockExec.mockResolvedValueOnce(5);

      const total = await repository.countAll({ search: '015' });

      expect(total).toBe(5);
      const countCalls = mockUserModel.countDocuments.mock.calls as Array<
        [Record<string, unknown>]
      >;
      const countQuery = countCalls[0]?.[0];
      expect(countQuery?.deletedAt).toBeNull();
      const orList = countQuery?.$or as Array<Record<string, unknown>>;
      expect(Array.isArray(orList)).toBe(true);
      expect(orList[3]).toEqual({ phoneNumber: { $regex: /015/i } });
    });
  });
});
