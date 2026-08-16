import { Types, ClientSession } from 'mongoose';
import { AutoBid } from '../entities/auto-bid.entity';
import { AutoBidStatus } from '../enums/auto-bid-status.enum';

export interface SetAutoBidData {
  auctionId: Types.ObjectId;
  userId: Types.ObjectId;
  maxAmount: number;
}

export interface IAutoBidRepository {
  startSession(): Promise<ClientSession>;

  findActiveByAuctionId(
    auctionId: string,
    session?: ClientSession,
  ): Promise<AutoBid[]>;

  findByAuctionAndUser(
    auctionId: string,
    userId: string,
    session?: ClientSession,
  ): Promise<AutoBid | null>;

  findActiveByAuctionAndUser(
    auctionId: string,
    userId: string,
    session?: ClientSession,
  ): Promise<AutoBid | null>;

  findActiveByAuctionAndMaxAmount(
    auctionId: string,
    maxAmount: number,
    session?: ClientSession,
  ): Promise<AutoBid | null>;

  upsert(data: SetAutoBidData, session?: ClientSession): Promise<AutoBid>;

  updateStatus(
    autoBidId: string,
    status: AutoBidStatus,
    session?: ClientSession,
  ): Promise<void>;

  cancel(
    auctionId: string,
    userId: string,
    session?: ClientSession,
  ): Promise<AutoBid | null>;

  findByUserId(
    userId: string,
    page?: number,
    limit?: number,
    status?: AutoBidStatus,
  ): Promise<{ items: AutoBid[]; total: number }>;

  deactivateAllForAuction(
    auctionId: string,
    targetStatus?: AutoBidStatus,
    session?: ClientSession,
  ): Promise<void>;

  countActiveByAuction(
    auctionId: string,
    session?: ClientSession,
  ): Promise<number>;
}
