import { Model, Types, ClientSession } from 'mongoose';
import { IAuctionRepository, AuctionsFilter, CreateAuctionData, UpdateAuctionData } from '../interfaces/auction-repository.interface';
import { Auction, AuctionDocument } from '../entities/auction.entity';
import { AuctionStatus } from '../enums/auction-status.enum';
import { BidDocument } from '../../bids/entities/bid.entity';
export declare class MongoAuctionRepository implements IAuctionRepository {
    private readonly auctionModel;
    private readonly bidModel;
    constructor(auctionModel: Model<AuctionDocument>, bidModel: Model<BidDocument>);
    startSession(): Promise<ClientSession>;
    create(data: CreateAuctionData): Promise<Auction>;
    findById(id: string, session?: ClientSession): Promise<Auction | null>;
    findAll(page: number, limit: number, filter: AuctionsFilter, excludeStatuses?: AuctionStatus[]): Promise<{
        items: Auction[];
        total: number;
    }>;
    findBySellerId(sellerId: string, page: number, limit: number, filter: AuctionsFilter): Promise<{
        items: Auction[];
        total: number;
    }>;
    findByWinnerId(winnerId: string, page: number, limit: number, filter: AuctionsFilter): Promise<{
        items: Auction[];
        total: number;
    }>;
    update(id: string, data: UpdateAuctionData): Promise<Auction | null>;
    updateStatus(id: string, status: AuctionStatus, session?: ClientSession, adminActionReason?: string): Promise<void>;
    updateManyStatus(ids: Types.ObjectId[], status: AuctionStatus): Promise<void>;
    findPendingToActivate(): Promise<Auction[]>;
    findActiveToEnd(): Promise<Auction[]>;
    updateCurrentPrice(id: string, price: number, session?: ClientSession): Promise<void>;
    findEndedWithoutWinner(): Promise<Auction[]>;
    findActiveOrPendingBySellerId(sellerId: string, session?: ClientSession): Promise<Auction[]>;
    finalizeAuction(id: string, winnerId?: string, session?: ClientSession): Promise<void>;
    private buildQuery;
    private buildSort;
    private executePaginatedQuery;
    findWinningBidByAuctionId(auctionId: string, session?: ClientSession): Promise<{
        bidderId: string;
        amount: number;
    } | null>;
    count(filter: AuctionsFilter, excludeStatuses?: AuctionStatus[]): Promise<number>;
    countUserAuctions(sellerId: string): Promise<{
        active: number;
        completed: number;
    }>;
    findEndedParticipantAuctionIds(userId: string): Promise<Types.ObjectId[]>;
    findByIds(ids: Types.ObjectId[]): Promise<Auction[]>;
}
