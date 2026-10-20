import { Model, ClientSession } from 'mongoose';
import { AutoBid, AutoBidDocument } from '../entities/auto-bid.entity';
import { AutoBidStatus } from '../enums/auto-bid-status.enum';
import { IAutoBidRepository, SetAutoBidData } from '../interfaces/auto-bid-repository.interface';
export declare class MongoAutoBidRepository implements IAutoBidRepository {
    private readonly autoBidModel;
    constructor(autoBidModel: Model<AutoBidDocument>);
    startSession(): Promise<ClientSession>;
    findActiveByAuctionId(auctionId: string, session?: ClientSession): Promise<AutoBid[]>;
    findByAuctionAndUser(auctionId: string, userId: string, session?: ClientSession): Promise<AutoBid | null>;
    findActiveByAuctionAndUser(auctionId: string, userId: string, session?: ClientSession): Promise<AutoBid | null>;
    findActiveByAuctionAndMaxAmount(auctionId: string, maxAmount: number, session?: ClientSession): Promise<AutoBid | null>;
    upsert(data: SetAutoBidData, session?: ClientSession): Promise<AutoBid>;
    updateStatus(autoBidId: string, status: AutoBidStatus, session?: ClientSession): Promise<void>;
    cancel(auctionId: string, userId: string, session?: ClientSession): Promise<AutoBid | null>;
    findByUserId(userId: string, page?: number, limit?: number, status?: AutoBidStatus): Promise<{
        items: AutoBid[];
        total: number;
    }>;
    deactivateAllForAuction(auctionId: string, targetStatus?: AutoBidStatus, session?: ClientSession): Promise<void>;
    countActiveByAuction(auctionId: string, session?: ClientSession): Promise<number>;
}
