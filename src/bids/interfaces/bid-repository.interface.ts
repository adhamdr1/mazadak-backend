import { Types, ClientSession } from 'mongoose';
import { Bid } from '../entities/bid.entity';
import { BidStatus } from '../enums/bid-status.enum';
import { BidsFilterInput } from '../dto/bids-filter.input';

export interface CreateBidData {
  auctionId: Types.ObjectId;
  bidderId: Types.ObjectId;
  amount: number;
  status: BidStatus;
}

export interface IBidRepository {
  create(data: CreateBidData, session?: ClientSession): Promise<Bid>;

  findWinningByAuctionId(auctionId: string): Promise<Bid | null>;

  findAll(
    page: number,
    limit: number,
    filter: BidsFilterInput,
  ): Promise<{ items: Bid[]; total: number }>;

  findByAuctionId(
    auctionId: string,
    page: number,
    limit: number,
    filter: BidsFilterInput,
  ): Promise<{ items: Bid[]; total: number }>;

  findByBidderId(
    bidderId: string,
    page: number,
    limit: number,
    filter: BidsFilterInput,
  ): Promise<{ items: Bid[]; total: number }>;

  updateStatus(
    bidId: string,
    status: BidStatus,
    session?: ClientSession,
  ): Promise<void>;
}
