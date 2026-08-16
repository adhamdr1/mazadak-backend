import { Test, TestingModule } from '@nestjs/testing';
import { ProxyBiddingEngineService } from './proxy-bidding-engine.service';
import { BidStatus } from '../enums/bid-status.enum';

describe('ProxyBiddingEngineService', () => {
  let engine: ProxyBiddingEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProxyBiddingEngineService],
    }).compile();

    engine = module.get<ProxyBiddingEngineService>(ProxyBiddingEngineService);
  });

  it('should be defined', () => {
    expect(engine).toBeDefined();
  });

  describe('Scenario 1: Single Auto-Bid on a fresh auction', () => {
    it('should win at startingPrice when no other bids exist', () => {
      const result = engine.calculateNextState(
        {
          startPrice: 1000,
          currentPrice: 1000,
          minimumBidIncrement: 100,
          hasExistingBids: false,
        },
        [
          {
            id: 'ab-1',
            userId: 'user-1',
            maxAmount: 5000,
            createdAt: new Date('2026-01-01T10:00:00Z'),
          },
        ],
      );

      expect(result.winningBidderId).toBe('user-1');
      expect(result.winningAmount).toBe(1000);
      expect(result.isAutoBid).toBe(true);
      expect(result.exhaustedAutoBidIds).toHaveLength(0);
      expect(result.bidsToCreate).toHaveLength(1);
      expect(result.bidsToCreate[0]).toEqual({
        bidderId: 'user-1',
        amount: 1000,
        status: BidStatus.WINNING,
        isAutoBid: true,
      });
    });
  });

  describe('Scenario 2: Two Auto-Bids competing', () => {
    it('should calculate winning amount as second max + increment', () => {
      const result = engine.calculateNextState(
        {
          startPrice: 1000,
          currentPrice: 1000,
          minimumBidIncrement: 100,
          hasExistingBids: false,
        },
        [
          {
            id: 'ab-1',
            userId: 'user-1',
            maxAmount: 5000,
            createdAt: new Date('2026-01-01T10:00:00Z'),
          },
          {
            id: 'ab-2',
            userId: 'user-2',
            maxAmount: 3000,
            createdAt: new Date('2026-01-01T10:05:00Z'),
          },
        ],
      );

      expect(result.winningBidderId).toBe('user-1');
      // user-2 max (3000) + increment (100) = 3100
      expect(result.winningAmount).toBe(3100);
      expect(result.exhaustedAutoBidIds).toContain('ab-2');
      expect(result.bidsToCreate).toHaveLength(2);
      expect(result.bidsToCreate).toEqual([
        {
          bidderId: 'user-2',
          amount: 3000,
          status: BidStatus.OUTBID,
          isAutoBid: true,
        },
        {
          bidderId: 'user-1',
          amount: 3100,
          status: BidStatus.WINNING,
          isAutoBid: true,
        },
      ]);
    });
  });

  describe('Scenario 3: Tie in MaxAmount (FIFO Priority)', () => {
    it('should give victory to the earlier auto-bid at exact tie amount', () => {
      const result = engine.calculateNextState(
        {
          startPrice: 1000,
          currentPrice: 1000,
          minimumBidIncrement: 100,
          hasExistingBids: false,
        },
        [
          {
            id: 'ab-1',
            userId: 'user-1',
            maxAmount: 5000,
            createdAt: new Date('2026-01-01T10:00:00Z'),
          },
          {
            id: 'ab-2',
            userId: 'user-2',
            maxAmount: 5000,
            createdAt: new Date('2026-01-01T10:05:00Z'),
          },
        ],
      );

      expect(result.winningBidderId).toBe('user-1');
      expect(result.winningAmount).toBe(5000);
      expect(result.exhaustedAutoBidIds).toEqual(['ab-2', 'ab-1']);
      expect(result.bidsToCreate[0].status).toBe(BidStatus.OUTBID);
      expect(result.bidsToCreate[1].status).toBe(BidStatus.WINNING);
    });
  });

  describe('Scenario 4: Manual Bid against an active Auto-Bid', () => {
    it('should outbid manual bidder when auto-bid max is higher', () => {
      const result = engine.calculateNextState(
        {
          startPrice: 1000,
          currentPrice: 2000,
          minimumBidIncrement: 100,
          hasExistingBids: true,
          currentWinnerId: 'user-1',
        },
        [
          {
            id: 'ab-1',
            userId: 'user-1',
            maxAmount: 5000,
            createdAt: new Date('2026-01-01T10:00:00Z'),
          },
        ],
        {
          bidderId: 'user-manual',
          amount: 2500,
        },
      );

      expect(result.winningBidderId).toBe('user-1');
      // manual amount (2500) + increment (100) = 2600
      expect(result.winningAmount).toBe(2600);
      expect(result.isAutoBid).toBe(true);
      expect(result.bidsToCreate).toHaveLength(2);
      expect(result.bidsToCreate[0]).toEqual({
        bidderId: 'user-manual',
        amount: 2500,
        status: BidStatus.OUTBID,
        isAutoBid: false,
      });
      expect(result.bidsToCreate[1]).toEqual({
        bidderId: 'user-1',
        amount: 2600,
        status: BidStatus.WINNING,
        isAutoBid: true,
      });
    });

    it('should let manual bidder win if manual amount exceeds auto-bid max', () => {
      const result = engine.calculateNextState(
        {
          startPrice: 1000,
          currentPrice: 2000,
          minimumBidIncrement: 100,
          hasExistingBids: true,
          currentWinnerId: 'user-1',
        },
        [
          {
            id: 'ab-1',
            userId: 'user-1',
            maxAmount: 5000,
            createdAt: new Date('2026-01-01T10:00:00Z'),
          },
        ],
        {
          bidderId: 'user-manual',
          amount: 6000,
        },
      );

      expect(result.winningBidderId).toBe('user-manual');
      expect(result.winningAmount).toBe(6000);
      expect(result.isAutoBid).toBe(false);
      expect(result.exhaustedAutoBidIds).toContain('ab-1');
      expect(result.bidsToCreate).toHaveLength(1);
      expect(result.bidsToCreate[0]).toEqual({
        bidderId: 'user-manual',
        amount: 6000,
        status: BidStatus.WINNING,
        isAutoBid: false,
      });
    });
  });
});
