import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types, Model } from 'mongoose';
import { MongoWalletRepository } from './mongo.wallet.repository';
import { Wallet, WalletDocument } from '../entities/wallet.entity';

describe('MongoWalletRepository', () => {
  let repository: MongoWalletRepository;

  const mockExec = jest.fn();
  const mockSave = jest.fn();

  // Create a proper mock for the Mongoose Model constructor and its static methods
  const mockWalletModel = jest
    .fn()
    .mockImplementation((dto: Partial<Wallet>) => ({
      ...dto,
      save: mockSave,
    })) as unknown as Model<WalletDocument> & {
    findOne: jest.Mock;
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    findOneAndUpdate: jest.Mock;
  };

  Object.assign(mockWalletModel, {
    findOne: jest.fn().mockReturnValue({ exec: mockExec }),
    findById: jest.fn().mockReturnValue({ exec: mockExec }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ exec: mockExec }),
    findOneAndUpdate: jest.fn().mockReturnValue({ exec: mockExec }),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongoWalletRepository,
        {
          provide: getModelToken(Wallet.name),
          useValue: mockWalletModel,
        },
      ],
    }).compile();

    repository = module.get<MongoWalletRepository>(MongoWalletRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a new wallet', async () => {
      const userId = new Types.ObjectId().toString();
      const savedWallet = {
        userId: new Types.ObjectId(userId),
      } as unknown as Wallet;
      mockSave.mockResolvedValue(savedWallet);
      const result = await repository.create(userId);
      expect(result).toBeDefined();
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('holdBalance', () => {
    it('should correctly increment heldBalance', async () => {
      const walletId = new Types.ObjectId().toString();
      mockExec.mockResolvedValue({
        _id: walletId,
        heldBalance: 100,
      });

      await repository.holdBalance(walletId, 100);

      expect(mockWalletModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: new Types.ObjectId(walletId),
          $expr: {
            $gte: [{ $subtract: ['$balance', '$heldBalance'] }, 100],
          },
        },
        { $inc: { heldBalance: 100 } },
        { returnDocument: 'after', session: undefined },
      );
    });
  });

  describe('releaseBalance', () => {
    it('should correctly decrement heldBalance', async () => {
      const walletId = new Types.ObjectId().toString();
      mockExec.mockResolvedValue({
        _id: walletId,
        heldBalance: 0,
      });

      await repository.releaseBalance(walletId, 100);

      expect(mockWalletModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: new Types.ObjectId(walletId),
          $expr: { $gte: ['$heldBalance', 100] },
        },
        { $inc: { heldBalance: -100 } },
        { returnDocument: 'after', session: undefined },
      );
    });
  });

  describe('captureHeldBalance', () => {
    it('should correctly decrement balance and heldBalance', async () => {
      const walletId = new Types.ObjectId().toString();
      mockExec.mockResolvedValue({
        _id: walletId,
        balance: 0,
        heldBalance: 0,
      });

      await repository.captureHeldBalance(walletId, 100);

      expect(mockWalletModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: new Types.ObjectId(walletId),
          $expr: { $gte: ['$heldBalance', 100] },
        },
        { $inc: { balance: -100, heldBalance: -100 } },
        { returnDocument: 'after', session: undefined },
      );
    });
  });
});
