import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { BidStatus } from '../enums/bid-status.enum';
import { NoActiveAutoBidsException } from '../exceptions/no-active-auto-bids.exception';

export interface AuctionEngineState {
  startPrice: number;
  currentPrice: number;
  minimumBidIncrement: number;
  hasExistingBids: boolean;
  currentWinnerId?: string;
}

export interface AutoBidCandidate {
  id: string;
  userId: string;
  maxAmount: number;
  createdAt: Date;
}

export interface ManualBidCandidate {
  bidderId: string;
  amount: number;
}

export interface GeneratedBid {
  bidderId: string;
  amount: number;
  status: BidStatus;
  isAutoBid: boolean;
}

export interface ProxyEngineResult {
  winningBidderId: string;
  winningAmount: number;
  isAutoBid: boolean;
  winningAutoBidId?: string;
  exhaustedAutoBidIds: string[];
  bidsToCreate: GeneratedBid[];
}

@Injectable()
export class ProxyBiddingEngineService {
  /**
   * Pure deterministic calculation of auction next state when a manual bid or auto-bid is processed.
   *
   * @param auction State of the auction before this calculation
   * @param activeAutoBids List of currently active auto-bids sorted by maxAmount DESC, createdAt ASC
   * @param manualBid Optional manual bid being submitted in this turn
   */
  calculateNextState(
    auction: AuctionEngineState,
    activeAutoBids: AutoBidCandidate[],
    manualBid?: ManualBidCandidate,
  ): ProxyEngineResult {
    const increment = new Decimal(auction.minimumBidIncrement);
    const exhaustedAutoBidIds: string[] = [];
    const bidsToCreate: GeneratedBid[] = [];

    // Filter and sort candidates defensively
    const sortedAutoBids = [...activeAutoBids].sort((a, b) => {
      const diff = new Decimal(b.maxAmount).minus(a.maxAmount).toNumber();
      if (diff !== 0) return diff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // 1. Scenario A: A manual bid is submitted
    if (manualBid) {
      const manualAmount = new Decimal(manualBid.amount);

      // Find if there is an active auto-bid by ANOTHER user that can compete
      const competingAutoBids = sortedAutoBids.filter(
        (ab) => ab.userId !== manualBid.bidderId,
      );

      if (competingAutoBids.length === 0) {
        // No competing auto-bids -> Manual bidder wins at their offered amount
        const winningAmount = manualAmount.toNumber();
        bidsToCreate.push({
          bidderId: manualBid.bidderId,
          amount: winningAmount,
          status: BidStatus.WINNING,
          isAutoBid: false,
        });

        return {
          winningBidderId: manualBid.bidderId,
          winningAmount,
          isAutoBid: false,
          exhaustedAutoBidIds,
          bidsToCreate,
        };
      }

      const topAutoBid = competingAutoBids[0];
      const topAutoBidMax = new Decimal(topAutoBid.maxAmount);

      // Mark all lower competing auto-bids whose maxAmount <= manualAmount as exhausted
      for (const ab of competingAutoBids) {
        if (new Decimal(ab.maxAmount).lte(manualAmount)) {
          exhaustedAutoBidIds.push(ab.id);
        }
      }

      if (topAutoBidMax.gte(manualAmount.plus(increment))) {
        // The top auto-bid easily beats the manual bid with a full increment
        // 1. Record the manual bid as OUTBID
        bidsToCreate.push({
          bidderId: manualBid.bidderId,
          amount: manualAmount.toNumber(),
          status: BidStatus.OUTBID,
          isAutoBid: false,
        });

        // 2. The auto-bid counters with manualAmount + increment
        const autoBidAmount = manualAmount.plus(increment).toNumber();
        bidsToCreate.push({
          bidderId: topAutoBid.userId,
          amount: autoBidAmount,
          status: BidStatus.WINNING,
          isAutoBid: true,
        });

        return {
          winningBidderId: topAutoBid.userId,
          winningAmount: autoBidAmount,
          isAutoBid: true,
          winningAutoBidId: topAutoBid.id,
          exhaustedAutoBidIds,
          bidsToCreate,
        };
      } else if (topAutoBidMax.gt(manualAmount)) {
        // Top auto-bid beats manual bid, but cannot add a full increment (reaches maxAmount)
        bidsToCreate.push({
          bidderId: manualBid.bidderId,
          amount: manualAmount.toNumber(),
          status: BidStatus.OUTBID,
          isAutoBid: false,
        });

        const autoBidAmount = topAutoBidMax.toNumber();
        bidsToCreate.push({
          bidderId: topAutoBid.userId,
          amount: autoBidAmount,
          status: BidStatus.WINNING,
          isAutoBid: true,
        });

        // Since it reached its maxAmount, it is now exhausted from future automatic raises
        exhaustedAutoBidIds.push(topAutoBid.id);

        return {
          winningBidderId: topAutoBid.userId,
          winningAmount: autoBidAmount,
          isAutoBid: true,
          winningAutoBidId: topAutoBid.id,
          exhaustedAutoBidIds,
          bidsToCreate,
        };
      } else if (topAutoBidMax.eq(manualAmount)) {
        // Tie in amount: Auto-bid has FIFO priority because it was placed before the manual bid!
        bidsToCreate.push({
          bidderId: manualBid.bidderId,
          amount: manualAmount.toNumber(),
          status: BidStatus.OUTBID,
          isAutoBid: false,
        });

        const autoBidAmount = topAutoBidMax.toNumber();
        bidsToCreate.push({
          bidderId: topAutoBid.userId,
          amount: autoBidAmount,
          status: BidStatus.WINNING,
          isAutoBid: true,
        });

        exhaustedAutoBidIds.push(topAutoBid.id);

        return {
          winningBidderId: topAutoBid.userId,
          winningAmount: autoBidAmount,
          isAutoBid: true,
          winningAutoBidId: topAutoBid.id,
          exhaustedAutoBidIds,
          bidsToCreate,
        };
      } else {
        // Manual bid exceeds top auto-bid max -> Manual bidder wins!
        const winningAmount = manualAmount.toNumber();
        bidsToCreate.push({
          bidderId: manualBid.bidderId,
          amount: winningAmount,
          status: BidStatus.WINNING,
          isAutoBid: false,
        });

        return {
          winningBidderId: manualBid.bidderId,
          winningAmount,
          isAutoBid: false,
          exhaustedAutoBidIds,
          bidsToCreate,
        };
      }
    }

    // 2. Scenario B: An Auto-Bid was added or evaluated with NO manual bid
    if (sortedAutoBids.length === 0) {
      throw new NoActiveAutoBidsException();
    }

    const topAutoBid = sortedAutoBids[0];
    const topAutoBidMax = new Decimal(topAutoBid.maxAmount);
    const secondAutoBid = sortedAutoBids.length > 1 ? sortedAutoBids[1] : null;

    if (!auction.hasExistingBids) {
      // First bid on the auction ever
      if (!secondAutoBid) {
        // Only 1 auto-bid placed: enters at startPrice
        const winningAmount = new Decimal(auction.startPrice).toNumber();
        bidsToCreate.push({
          bidderId: topAutoBid.userId,
          amount: winningAmount,
          status: BidStatus.WINNING,
          isAutoBid: true,
        });

        return {
          winningBidderId: topAutoBid.userId,
          winningAmount,
          isAutoBid: true,
          winningAutoBidId: topAutoBid.id,
          exhaustedAutoBidIds,
          bidsToCreate,
        };
      } else {
        // Multiple auto-bids placed on fresh auction: Top beats Second
        const secondMax = new Decimal(secondAutoBid.maxAmount);
        exhaustedAutoBidIds.push(secondAutoBid.id);

        // Mark any lower ones as exhausted too
        for (let i = 2; i < sortedAutoBids.length; i++) {
          exhaustedAutoBidIds.push(sortedAutoBids[i].id);
        }

        // Price is secondMax + increment (or topMax if less)
        const targetPrice = Decimal.min(
          topAutoBidMax,
          secondMax.plus(increment),
        );
        const winningAmount = targetPrice.toNumber();

        bidsToCreate.push({
          bidderId: secondAutoBid.userId,
          amount: secondMax.toNumber(),
          status: BidStatus.OUTBID,
          isAutoBid: true,
        });

        bidsToCreate.push({
          bidderId: topAutoBid.userId,
          amount: winningAmount,
          status: BidStatus.WINNING,
          isAutoBid: true,
        });

        if (topAutoBidMax.eq(targetPrice)) {
          exhaustedAutoBidIds.push(topAutoBid.id);
        }

        return {
          winningBidderId: topAutoBid.userId,
          winningAmount,
          isAutoBid: true,
          winningAutoBidId: topAutoBid.id,
          exhaustedAutoBidIds,
          bidsToCreate,
        };
      }
    } else {
      // Auction already has existing bids and a current price
      const currentPrice = new Decimal(auction.currentPrice);

      if (auction.currentWinnerId === topAutoBid.userId) {
        // The top auto-bid is already the winning bidder
        if (!secondAutoBid) {
          // No competitor -> nothing changes
          return {
            winningBidderId: topAutoBid.userId,
            winningAmount: currentPrice.toNumber(),
            isAutoBid: true,
            winningAutoBidId: topAutoBid.id,
            exhaustedAutoBidIds,
            bidsToCreate: [],
          };
        } else {
          // Second auto-bid entered or exists, calculate price needed to beat second
          const secondMax = new Decimal(secondAutoBid.maxAmount);
          if (secondMax.gte(currentPrice)) {
            exhaustedAutoBidIds.push(secondAutoBid.id);
            for (let i = 2; i < sortedAutoBids.length; i++) {
              exhaustedAutoBidIds.push(sortedAutoBids[i].id);
            }

            const targetPrice = Decimal.min(
              topAutoBidMax,
              secondMax.plus(increment),
            );
            const winningAmount = targetPrice.toNumber();

            bidsToCreate.push({
              bidderId: topAutoBid.userId,
              amount: winningAmount,
              status: BidStatus.WINNING,
              isAutoBid: true,
            });

            if (topAutoBidMax.eq(targetPrice)) {
              exhaustedAutoBidIds.push(topAutoBid.id);
            }

            return {
              winningBidderId: topAutoBid.userId,
              winningAmount,
              isAutoBid: true,
              winningAutoBidId: topAutoBid.id,
              exhaustedAutoBidIds,
              bidsToCreate,
            };
          } else {
            return {
              winningBidderId: topAutoBid.userId,
              winningAmount: currentPrice.toNumber(),
              isAutoBid: true,
              winningAutoBidId: topAutoBid.id,
              exhaustedAutoBidIds,
              bidsToCreate: [],
            };
          }
        }
      } else {
        // Someone else was winning, topAutoBid now enters to challenge
        const requiredToBeat = currentPrice.plus(increment);
        const secondMax = secondAutoBid
          ? new Decimal(secondAutoBid.maxAmount)
          : currentPrice;

        const baseForCalculation = Decimal.max(requiredToBeat, secondMax);

        // Mark second and lower as exhausted if top beats them
        if (secondAutoBid) {
          exhaustedAutoBidIds.push(secondAutoBid.id);
        }
        for (let i = 2; i < sortedAutoBids.length; i++) {
          exhaustedAutoBidIds.push(sortedAutoBids[i].id);
        }

        const targetPrice = Decimal.min(
          topAutoBidMax,
          baseForCalculation.plus(
            secondAutoBid && secondMax.gt(currentPrice) ? increment : 0,
          ),
        );
        const finalWinningPrice = Decimal.max(requiredToBeat, targetPrice);
        const winningAmount = finalWinningPrice.toNumber();

        bidsToCreate.push({
          bidderId: topAutoBid.userId,
          amount: winningAmount,
          status: BidStatus.WINNING,
          isAutoBid: true,
        });

        if (topAutoBidMax.lte(finalWinningPrice)) {
          exhaustedAutoBidIds.push(topAutoBid.id);
        }

        return {
          winningBidderId: topAutoBid.userId,
          winningAmount,
          isAutoBid: true,
          winningAutoBidId: topAutoBid.id,
          exhaustedAutoBidIds,
          bidsToCreate,
        };
      }
    }
  }
}
