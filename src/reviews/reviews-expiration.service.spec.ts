import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsExpirationService } from './reviews-expiration.service';
import { ReviewsService } from './reviews.service';
import { getRedisConnectionToken } from '@nestjs-modules/ioredis';
import { RELEASE_LOCK_LUA_SCRIPT } from '../infrastructure/redis/redis.constants';

const mockReviewsService = {
  publishExpiredPendingReviews: jest.fn(),
};

const mockRedis = {
  set: jest.fn(),
  eval: jest.fn(),
};

describe('ReviewsExpirationService', () => {
  let service: ReviewsExpirationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsExpirationService,
        {
          provide: ReviewsService,
          useValue: mockReviewsService,
        },
        {
          provide: getRedisConnectionToken('default'),
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<ReviewsExpirationService>(ReviewsExpirationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleExpiredPendingReviews', () => {
    it('should acquire lock, run expiration task and release lock', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockReviewsService.publishExpiredPendingReviews.mockResolvedValue(3);
      mockRedis.eval.mockResolvedValue(1);

      await service.handleExpiredPendingReviews();

      expect(mockRedis.set).toHaveBeenCalledWith(
        'reviews:expiration:lock',
        expect.any(String),
        'EX',
        30,
        'NX',
      );
      expect(
        mockReviewsService.publishExpiredPendingReviews,
      ).toHaveBeenCalled();
      expect(mockRedis.eval).toHaveBeenCalledWith(
        RELEASE_LOCK_LUA_SCRIPT,
        1,
        'reviews:expiration:lock',
        expect.any(String),
      );
    });

    it('should skip execution if lock is not acquired', async () => {
      mockRedis.set.mockResolvedValue(null);

      await service.handleExpiredPendingReviews();

      expect(
        mockReviewsService.publishExpiredPendingReviews,
      ).not.toHaveBeenCalled();
      expect(mockRedis.eval).not.toHaveBeenCalled();
    });

    it('should handle redis lock error gracefully', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis connection error'));

      await service.handleExpiredPendingReviews();

      expect(
        mockReviewsService.publishExpiredPendingReviews,
      ).not.toHaveBeenCalled();
    });

    it('should handle service execution error and still release lock', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockReviewsService.publishExpiredPendingReviews.mockRejectedValue(
        new Error('DB error'),
      );
      mockRedis.eval.mockResolvedValue(1);

      await service.handleExpiredPendingReviews();

      expect(mockRedis.eval).toHaveBeenCalledWith(
        RELEASE_LOCK_LUA_SCRIPT,
        1,
        'reviews:expiration:lock',
        expect.any(String),
      );
    });
  });
});
