import { Types } from 'mongoose';
import { Auction } from '../entities/auction.entity';
import { AuctionStatus } from '../enums/auction-status.enum';
import { AuctionCategory } from '../enums/auction-category.enum';

export interface AuctionsFilter {
  category?: AuctionCategory;
  status?: AuctionStatus;
  search?: string;
  page: number;
  limit: number;
}

export interface CreateAuctionData {
  sellerId: Types.ObjectId;
  title: string;
  description: string;
  category: AuctionCategory;
  startingPrice: number;
  minimumBidIncrement: number;
  images: string[];
  startTime: Date;
  endTime: Date;
}

export interface UpdateAuctionData {
  title?: string;
  description?: string;
  category?: AuctionCategory;
  images?: string[];
  startTime?: Date;
  endTime?: Date;
}

export interface IAuctionRepository {
  create(data: CreateAuctionData): Promise<Auction>;

  findById(id: string): Promise<Auction | null>;

  findAll(filter: AuctionsFilter): Promise<{ items: Auction[]; total: number }>;

  findBySellerId(
    sellerId: string,
    filter: AuctionsFilter,
  ): Promise<{ items: Auction[]; total: number }>;

  findByWinnerId(
    winnerId: string,
    filter: AuctionsFilter,
  ): Promise<{ items: Auction[]; total: number }>;

  update(id: string, data: UpdateAuctionData): Promise<Auction | null>;

  updateStatus(id: string, status: AuctionStatus): Promise<void>;

  updateManyStatus(ids: Types.ObjectId[], status: AuctionStatus): Promise<void>;

  findPendingToActivate(): Promise<Auction[]>;

  findActiveToEnd(): Promise<Auction[]>;
}
