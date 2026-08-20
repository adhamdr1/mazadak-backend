import { Test, TestingModule } from '@nestjs/testing';
import { EscrowExpirationService } from './escrow-expiration.service';
import { EscrowService } from './escrow.service';
import { getRedisConnectionToken } from '@nestjs-modules/ioredis';

const mockEscrowService = {
  releaseExpiredHeldEscrows: jest.fn(),
};

const mockRedis = {
  set: jest.fn(),
  eval: jest.fn(),
};

describe('EscrowExpirationService', () => {
  let service: EscrowExpirationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EscrowExpirationService,
        { provide: EscrowService, useValue: mockEscrowService },
        { provide: getRedisConnectionToken('default'), useValue: mockRedis },
      ],
    }).compile();

    service = module.get<EscrowExpirationService>(EscrowExpirationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleExpiredHeldEscrows', () => {
    it('should acquire lock and process expired escrows if lock is obtained', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockEscrowService.releaseExpiredHeldEscrows.mockResolvedValue(5);
      mockRedis.eval.mockResolvedValue(1);

      await service.handleExpiredHeldEscrows();

      expect(mockRedis.set).toHaveBeenCalledWith(
        'escrow:expiration:lock',
        expect.any(String),
        'EX',
        30,
        'NX',
      );
      expect(mockEscrowService.releaseExpiredHeldEscrows).toHaveBeenCalled();
      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.any(String),
        1,
        'escrow:expiration:lock',
        expect.any(String),
      );
    });

    it('should not process if lock is not obtained', async () => {
      mockRedis.set.mockResolvedValue(null);

      await service.handleExpiredHeldEscrows();

      expect(
        mockEscrowService.releaseExpiredHeldEscrows,
      ).not.toHaveBeenCalled();
      expect(mockRedis.eval).not.toHaveBeenCalled();
    });

    it('should handle redis set error gracefully', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis error'));

      await service.handleExpiredHeldEscrows();

      expect(
        mockEscrowService.releaseExpiredHeldEscrows,
      ).not.toHaveBeenCalled();
      expect(mockRedis.eval).not.toHaveBeenCalled();
    });

    it('should release lock even if releaseExpiredHeldEscrows throws', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockEscrowService.releaseExpiredHeldEscrows.mockRejectedValue(
        new Error('Process error'),
      );
      mockRedis.eval.mockResolvedValue(1);

      await service.handleExpiredHeldEscrows();

      expect(mockEscrowService.releaseExpiredHeldEscrows).toHaveBeenCalled();
      expect(mockRedis.eval).toHaveBeenCalled();
    });
  });
});
