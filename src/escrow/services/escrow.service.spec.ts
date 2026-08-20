import { Test, TestingModule } from '@nestjs/testing';
import { EscrowService } from './escrow.service';
import { WalletService } from '../../wallet/wallet.service';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import { getConnectionToken } from '@nestjs/mongoose';
import { Types, ClientSession } from 'mongoose';
import { EscrowStatus } from '../enums';
import { RabbitMQEvent } from '../../infrastructure/rabbitmq/rabbitmq-event.types';
import { TransactionReferenceType } from '../../transaction/enums/transaction-reference-type.enum';
import {
  EscrowNotFoundException,
  EscrowAlreadyReleasedException,
  EscrowUnauthorizedException,
} from '../exceptions';
import { EscrowsPage } from '../dto';

import { Escrow } from '../entities';

const mockEscrowRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findByAuctionId: jest.fn(),
  updateStatus: jest.fn(),
  findPaginated: jest.fn(),
  findExpiredHeldEscrows: jest.fn(),
};

const mockWalletService = {
  deposit: jest.fn(),
};

const mockOutboxService = {
  saveEvent: jest.fn(),
};

const mockSession = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn(),
};

const mockConnection = {
  startSession: jest.fn().mockResolvedValue(mockSession),
};

describe('EscrowService', () => {
  let service: EscrowService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EscrowService,
        { provide: 'IEscrowRepository', useValue: mockEscrowRepository },
        { provide: WalletService, useValue: mockWalletService },
        { provide: OutboxService, useValue: mockOutboxService },
        { provide: getConnectionToken(), useValue: mockConnection },
      ],
    }).compile();

    service = module.get<EscrowService>(EscrowService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const auctionId = new Types.ObjectId().toString();
  const buyerId = new Types.ObjectId().toString();
  const sellerId = new Types.ObjectId().toString();
  const escrowId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();
  const now = new Date();

  const mockEscrow: Escrow = {
    _id: new Types.ObjectId(escrowId),
    auctionId: new Types.ObjectId(auctionId),
    buyerId: new Types.ObjectId(buyerId),
    sellerId: new Types.ObjectId(sellerId),
    amount: Types.Decimal128.fromString('1000'),
    currency: 'EGP',
    status: EscrowStatus.HELD,
    inspectionPeriodEndsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    createdAt: now,
    updatedAt: now,
  };

  describe('createEscrow', () => {
    it('should create an escrow and emit an event', async () => {
      mockEscrowRepository.findByAuctionId.mockResolvedValue(null);
      mockEscrowRepository.create.mockResolvedValue(mockEscrow);
      mockOutboxService.saveEvent.mockResolvedValue(undefined);

      const result = await service.createEscrow({
        auctionId,
        buyerId,
        sellerId,
        amount: 1000,
      });

      expect(result).toEqual(mockEscrow);
      expect(mockEscrowRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          auctionId: new Types.ObjectId(auctionId),
          buyerId: new Types.ObjectId(buyerId),
          sellerId: new Types.ObjectId(sellerId),
          currency: 'EGP',
        }),
        undefined,
      );
      expect(mockOutboxService.saveEvent).toHaveBeenCalledWith(
        RabbitMQEvent.EscrowCreated,
        expect.objectContaining({
          escrowId,
          auctionId,
          buyerId,
          sellerId,
          amount: 1000,
          currency: 'EGP',
        }),
        undefined,
      );
    });

    it('should return existing escrow if already exists', async () => {
      mockEscrowRepository.findByAuctionId.mockResolvedValue(mockEscrow);

      const result = await service.createEscrow({
        auctionId,
        buyerId,
        sellerId,
        amount: 1000,
      });

      expect(result).toEqual(mockEscrow);
      expect(mockEscrowRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('confirmDelivery', () => {
    it('should confirm delivery and release to seller', async () => {
      mockEscrowRepository.findById.mockResolvedValue(mockEscrow);
      mockWalletService.deposit.mockResolvedValue(undefined);

      const releasedEscrow = { ...mockEscrow, status: EscrowStatus.RELEASED };
      mockEscrowRepository.updateStatus.mockResolvedValue(releasedEscrow);

      const result = await service.confirmDelivery(buyerId, escrowId);

      expect(result).toEqual(releasedEscrow);
      expect(mockWalletService.deposit).toHaveBeenCalledWith(
        sellerId,
        1000,
        auctionId,
        mockSession as unknown as ClientSession,
        'EGP',
        TransactionReferenceType.ESCROW,
      );
      expect(mockEscrowRepository.updateStatus).toHaveBeenCalledWith(
        escrowId,
        EscrowStatus.RELEASED,
        expect.objectContaining({ releaseReason: 'BUYER_CONFIRMED' }),
        mockSession,
      );
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    it('should throw EscrowNotFoundException if escrow not found', async () => {
      mockEscrowRepository.findById.mockResolvedValue(null);
      await expect(service.confirmDelivery(buyerId, escrowId)).rejects.toThrow(
        EscrowNotFoundException,
      );
    });

    it('should throw EscrowUnauthorizedException if caller is not buyer', async () => {
      mockEscrowRepository.findById.mockResolvedValue(mockEscrow);
      await expect(service.confirmDelivery(sellerId, escrowId)).rejects.toThrow(
        EscrowUnauthorizedException,
      );
    });

    it('should throw EscrowAlreadyReleasedException if status is RELEASED', async () => {
      const releasedEscrow = { ...mockEscrow, status: EscrowStatus.RELEASED };
      mockEscrowRepository.findById.mockResolvedValue(releasedEscrow);
      await expect(service.confirmDelivery(buyerId, escrowId)).rejects.toThrow(
        EscrowAlreadyReleasedException,
      );
    });
  });

  describe('releaseEscrow', () => {
    it('should release escrow', async () => {
      mockEscrowRepository.findById.mockResolvedValue(mockEscrow);
      const releasedEscrow = { ...mockEscrow, status: EscrowStatus.RELEASED };
      mockEscrowRepository.updateStatus.mockResolvedValue(releasedEscrow);
      mockWalletService.deposit.mockResolvedValue(undefined);

      const result = await service.releaseEscrow(escrowId, 'ADMIN_DECISION');

      expect(result).toEqual(releasedEscrow);
      expect(mockWalletService.deposit).toHaveBeenCalledWith(
        sellerId,
        1000,
        auctionId,
        undefined,
        'EGP',
        TransactionReferenceType.ESCROW,
      );
      expect(mockOutboxService.saveEvent).toHaveBeenCalledWith(
        RabbitMQEvent.EscrowReleased,
        expect.objectContaining({ releaseReason: 'ADMIN_DECISION' }),
        undefined,
      );
    });
  });

  describe('refundEscrow', () => {
    it('should refund escrow to buyer', async () => {
      mockEscrowRepository.findById.mockResolvedValue(mockEscrow);
      const refundedEscrow = { ...mockEscrow, status: EscrowStatus.REFUNDED };
      mockEscrowRepository.updateStatus.mockResolvedValue(refundedEscrow);
      mockWalletService.deposit.mockResolvedValue(undefined);

      const result = await service.refundEscrow(escrowId, 'DISPUTE_WON_BUYER');

      expect(result).toEqual(refundedEscrow);
      expect(mockWalletService.deposit).toHaveBeenCalledWith(
        buyerId,
        1000,
        auctionId,
        undefined,
        'EGP',
        TransactionReferenceType.ESCROW,
      );
      expect(mockOutboxService.saveEvent).toHaveBeenCalledWith(
        RabbitMQEvent.EscrowRefunded,
        expect.objectContaining({ refundReason: 'DISPUTE_WON_BUYER' }),
        undefined,
      );
    });

    it('should throw EscrowNotFoundException if not found', async () => {
      mockEscrowRepository.findById.mockResolvedValue(null);
      await expect(service.refundEscrow(escrowId, 'reason')).rejects.toThrow(
        EscrowNotFoundException,
      );
    });
  });

  describe('getEscrowById', () => {
    it('should return escrow by id', async () => {
      mockEscrowRepository.findById.mockResolvedValue(mockEscrow);
      const result = await service.getEscrowById(escrowId);
      expect(result).toEqual(mockEscrow);
    });

    it('should throw EscrowNotFoundException if not found', async () => {
      mockEscrowRepository.findById.mockResolvedValue(null);
      await expect(service.getEscrowById(escrowId)).rejects.toThrow(
        EscrowNotFoundException,
      );
    });
  });

  describe('getEscrowByAuctionId', () => {
    it('should return escrow by auction id', async () => {
      mockEscrowRepository.findByAuctionId.mockResolvedValue(mockEscrow);
      const result = await service.getEscrowByAuctionId(auctionId);
      expect(result).toEqual(mockEscrow);
    });
  });

  describe('getMyEscrows', () => {
    it('should return paginated escrows', async () => {
      const pageData = { items: [mockEscrow], total: 1 };
      mockEscrowRepository.findPaginated.mockResolvedValue(pageData);

      const result = await service.getMyEscrows(userId, { page: 1, limit: 10 });
      const expectedPage: EscrowsPage = {
        items: [mockEscrow],
        total: 1,
        totalPages: 1,
        hasNextPage: false,
      };
      expect(result).toEqual(expectedPage);
    });
  });

  describe('getAllEscrows', () => {
    it('should return paginated escrows for admin', async () => {
      const pageData = { items: [mockEscrow], total: 1 };
      mockEscrowRepository.findPaginated.mockResolvedValue(pageData);

      const result = await service.getAllEscrows({ page: 1, limit: 10 });
      const expectedPage: EscrowsPage = {
        items: [mockEscrow],
        total: 1,
        totalPages: 1,
        hasNextPage: false,
      };
      expect(result).toEqual(expectedPage);
    });
  });

  describe('releaseExpiredHeldEscrows', () => {
    it('should release expired escrows', async () => {
      mockEscrowRepository.findExpiredHeldEscrows.mockResolvedValue([
        mockEscrow,
      ]);

      const releasedEscrow = { ...mockEscrow, status: EscrowStatus.RELEASED };
      mockEscrowRepository.findById.mockResolvedValue(mockEscrow);
      mockEscrowRepository.updateStatus.mockResolvedValue(releasedEscrow);

      const result = await service.releaseExpiredHeldEscrows(10);
      expect(result).toBe(1);

      expect(mockEscrowRepository.updateStatus).toHaveBeenCalledWith(
        escrowId,
        EscrowStatus.RELEASED,
        expect.objectContaining({ releaseReason: 'EXPIRED_INSPECTION_WINDOW' }),
        mockSession,
      );
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });
  });
});
