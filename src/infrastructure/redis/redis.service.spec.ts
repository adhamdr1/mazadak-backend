import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { getRedisConnectionToken } from '@nestjs-modules/ioredis';
import { Logger } from '@nestjs/common';

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn().mockResolvedValue(1),
  scan: jest.fn(),
  eval: jest.fn().mockResolvedValue(1),
};

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Disable logger to avoid spamming the console during tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: getRedisConnectionToken('default'),
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  describe('getOrSetSWR', () => {
    it('should return from fetcher and set cache on MISS', async () => {
      mockRedis.get.mockResolvedValue(null);
      const fetcher = jest.fn().mockResolvedValue({ id: 1 });

      const result = await service.getOrSetSWR('key', 1000, 3600, fetcher);

      expect(result).toEqual({ id: 1 });
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'key',
        expect.any(String),
        'EX',
        3600,
      );
    });

    it('should return cached data on fresh HIT without calling fetcher', async () => {
      const freshEntry = {
        data: { id: 2 },
        expiresAt: Date.now() + 10000,
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(freshEntry));
      const fetcher = jest.fn();

      const result = await service.getOrSetSWR('key', 1000, 3600, fetcher);

      expect(result).toEqual({ id: 2 });
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should return stale data immediately and call fetcher in background on stale HIT', async () => {
      const staleEntry = {
        data: { id: 3 },
        expiresAt: Date.now() - 10000, // already soft-expired
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(staleEntry));
      mockRedis.set.mockResolvedValue('OK'); // for the SETNX lock and data set

      let fetcherResolve: (val: unknown) => void;
      const fetcherPromise = new Promise((res) => {
        fetcherResolve = res;
      });
      const fetcher = jest.fn().mockReturnValue(fetcherPromise);

      const result = await service.getOrSetSWR('key', 1000, 3600, fetcher);

      // Returns stale data immediately
      expect(result).toEqual({ id: 3 });

      // Wait for background process to start (allow event loop to tick)
      await new Promise((resolve) => process.nextTick(resolve));

      // fetcher should have been called in background
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Resolve the fetcher to complete the background task (cleanup)
      fetcherResolve!({ id: 4 });
    });

    it('should collapse concurrent identical requests (SingleFlight) on cold cache', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');

      let fetcherResolve: (val: unknown) => void;
      const fetcherPromise = new Promise((res) => {
        fetcherResolve = res;
      });
      const fetcher = jest.fn().mockReturnValue(fetcherPromise);

      // Fire 3 concurrent requests
      const p1 = service.getOrSetSWR('concurrent', 1000, 3600, fetcher);
      const p2 = service.getOrSetSWR('concurrent', 1000, 3600, fetcher);
      const p3 = service.getOrSetSWR('concurrent', 1000, 3600, fetcher);

      fetcherResolve!({ shared: true });

      const results = await Promise.all([p1, p2, p3]);

      expect(results).toEqual([
        { shared: true },
        { shared: true },
        { shared: true },
      ]);
      // Fetcher should only be called ONCE despite 3 requests
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('should gracefully fallback to fetcher if Redis GET throws', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection down'));
      const fetcher = jest.fn().mockResolvedValue({ id: 5 });

      const result = await service.getOrSetSWR('err-key', 1000, 3600, fetcher);

      expect(result).toEqual({ id: 5 });
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('invalidatePattern', () => {
    it('should scan and delete keys matching pattern', async () => {
      mockRedis.scan
        .mockResolvedValueOnce(['10', ['key1', 'key2']])
        .mockResolvedValueOnce(['0', ['key3']]);

      mockRedis.del.mockResolvedValue(1);

      await service.invalidatePattern('pattern:*');

      expect(mockRedis.scan).toHaveBeenCalledTimes(2);
      expect(mockRedis.del).toHaveBeenCalledWith('key1', 'key2');
      expect(mockRedis.del).toHaveBeenCalledWith('key3');
    });

    it('should gracefully fail and not throw if scan throws', async () => {
      mockRedis.scan.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(
        service.invalidatePattern('pattern:*'),
      ).resolves.toBeUndefined();
    });
  });
});
