import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types, Model } from 'mongoose';
import { MongoWithdrawalRepository } from './mongo.withdrawal.repository';
import {
  WithdrawalRequest,
  WithdrawalRequestDocument,
} from '../entities/withdrawal-request.entity';
import { WithdrawalStatus } from '../enums/withdrawal-status.enum';
import { PayoutMethod } from '../enums/payout-method.enum';

describe('MongoWithdrawalRepository', () => {
  let repository: MongoWithdrawalRepository;

  const mockExec = jest.fn();
  const mockSave = jest.fn();

  const mockQueryChain = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    session: jest.fn().mockReturnThis(),
    exec: mockExec,
  };

  const mockWithdrawalModel = jest
    .fn()
    .mockImplementation((dto: Partial<WithdrawalRequest>) => ({
      ...dto,
      save: mockSave,
    })) as unknown as Model<WithdrawalRequestDocument> & {
    findById: jest.Mock;
    find: jest.Mock;
    countDocuments: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    findOneAndUpdate: jest.Mock;
    aggregate: jest.Mock;
  };

  Object.assign(mockWithdrawalModel, {
    findById: jest.fn().mockReturnValue({
      session: jest.fn().mockReturnValue({ exec: mockExec }),
    }),
    find: jest.fn().mockReturnValue(mockQueryChain),
    countDocuments: jest.fn().mockReturnValue({
      session: jest.fn().mockReturnValue({ exec: mockExec }),
    }),
    findByIdAndUpdate: jest.fn().mockReturnValue({
      exec: mockExec,
    }),
    findOneAndUpdate: jest.fn().mockReturnValue({
      exec: mockExec,
    }),
    aggregate: jest.fn().mockReturnValue({
      session: jest.fn().mockReturnValue(Promise.resolve([])),
    }),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongoWithdrawalRepository,
        {
          provide: getModelToken(WithdrawalRequest.name),
          useValue: mockWithdrawalModel,
        },
      ],
    }).compile();

    repository = module.get<MongoWithdrawalRepository>(
      MongoWithdrawalRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should instantiate model and call save', async () => {
      const mockSaved = {
        _id: new Types.ObjectId(),
        amount: 500,
      };
      mockSave.mockResolvedValue(mockSaved);

      const result = await repository.create({
        userId: new Types.ObjectId().toString(),
        amount: 500,
        fee: 10,
        feePercentage: 2,
        netAmount: 490,
        currency: 'EGP',
        payoutMethod: PayoutMethod.VODAFONE_CASH,
        payoutDetails: { phoneNumber: '01012345678' },
        status: WithdrawalStatus.PENDING,
      });

      expect(result).toBe(mockSaved);
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should find withdrawal by id', async () => {
      const id = new Types.ObjectId().toString();
      const mockDoc = { _id: id };
      mockExec.mockResolvedValue(mockDoc);

      const result = await repository.findById(id);

      expect(result).toBe(mockDoc);
      expect(mockWithdrawalModel.findById).toHaveBeenCalledWith(
        new Types.ObjectId(id),
      );
    });
  });

  describe('findByUserId & findAll', () => {
    it('should return paginated results for findByUserId', async () => {
      const userId = new Types.ObjectId().toString();
      const mockItems = [{ _id: '1' }, { _id: '2' }];
      mockExec
        .mockResolvedValueOnce(mockItems) // find.exec()
        .mockResolvedValueOnce(2); // countDocuments.exec()

      const result = await repository.findByUserId(userId, {
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        items: mockItems,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
      });
      expect(mockWithdrawalModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ userId: new Types.ObjectId(userId) }),
      );
    });

    it('should return paginated results for findAll', async () => {
      const mockItems = [{ _id: '1' }];
      mockExec.mockResolvedValueOnce(mockItems).mockResolvedValueOnce(1);

      const result = await repository.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        items: mockItems,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
      });
    });
  });

  describe('transitionStatus', () => {
    it('should atomically update status using findOneAndUpdate with userId filter', async () => {
      const id = new Types.ObjectId().toString();
      const userId = new Types.ObjectId().toString();
      const mockDoc = { _id: id, status: WithdrawalStatus.CANCELLED };
      mockExec.mockResolvedValue(mockDoc);

      const result = await repository.transitionStatus(
        id,
        [WithdrawalStatus.PENDING],
        WithdrawalStatus.CANCELLED,
        {},
        undefined,
        { userId },
      );

      expect(result).toBe(mockDoc);
      expect(mockWithdrawalModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: new Types.ObjectId(id),
          status: { $in: [WithdrawalStatus.PENDING] },
          userId: new Types.ObjectId(userId),
        },
        { $set: { status: WithdrawalStatus.CANCELLED } },
        { returnDocument: 'after', session: null },
      );
    });
  });

  describe('updateStatus', () => {
    it('should call findByIdAndUpdate', async () => {
      const id = new Types.ObjectId().toString();
      const mockDoc = { _id: id, status: WithdrawalStatus.COMPLETED };
      mockExec.mockResolvedValue(mockDoc);

      const result = await repository.updateStatus(
        id,
        WithdrawalStatus.COMPLETED,
        { adminReference: 'REF123' },
      );

      expect(result).toBe(mockDoc);
      expect(mockWithdrawalModel.findByIdAndUpdate).toHaveBeenCalledWith(
        new Types.ObjectId(id),
        {
          $set: {
            status: WithdrawalStatus.COMPLETED,
            adminReference: 'REF123',
          },
        },
        { returnDocument: 'after', session: null },
      );
    });
  });

  describe('hasActivePendingRequest & hasRequestToday', () => {
    it('hasActivePendingRequest should return true if count > 0', async () => {
      mockExec.mockResolvedValue(1);
      const res = await repository.hasActivePendingRequest(
        new Types.ObjectId().toString(),
      );
      expect(res).toBe(true);
    });

    it('hasRequestToday should return false if count is 0', async () => {
      mockExec.mockResolvedValue(0);
      const res = await repository.hasRequestToday(
        new Types.ObjectId().toString(),
      );
      expect(res).toBe(false);
    });
  });

  describe('aggregations', () => {
    it('countPendingWithdrawals should return count', async () => {
      mockExec.mockResolvedValue(5);
      const count = await repository.countPendingWithdrawals();
      expect(count).toBe(5);
    });

    it('sumPendingWithdrawals should parse decimal aggregate', async () => {
      mockWithdrawalModel.aggregate.mockReturnValue({
        session: jest
          .fn()
          .mockResolvedValue([
            { total: Types.Decimal128.fromString('1500.50') },
          ]),
      });

      const total = await repository.sumPendingWithdrawals();
      expect(total).toBe(1500.5);
    });

    it('sumCompletedWithdrawals should return 0 if no results', async () => {
      mockWithdrawalModel.aggregate.mockReturnValue({
        session: jest.fn().mockResolvedValue([]),
      });

      const total = await repository.sumCompletedWithdrawals();
      expect(total).toBe(0);
    });

    it('sumCollectedFees should parse decimal aggregate', async () => {
      mockWithdrawalModel.aggregate.mockReturnValue({
        session: jest
          .fn()
          .mockResolvedValue([{ total: Types.Decimal128.fromString('45.00') }]),
      });

      const total = await repository.sumCollectedFees();
      expect(total).toBe(45);
    });
  });
});
