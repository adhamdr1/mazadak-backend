import { Model, ClientSession } from 'mongoose';
import { Bid, BidDocument } from '../entities/bid.entity';
import { BidStatus } from '../enums/bid-status.enum';
import { BidsFilterInput } from '../dto/bids-filter.input';
import { IBidRepository, CreateBidData } from '../interfaces/bid-repository.interface';
export declare class MongoBidRepository implements IBidRepository {
    private readonly bidModel;
    constructor(bidModel: Model<BidDocument>);
    startSession(): Promise<ClientSession>;
    create(data: CreateBidData, session?: ClientSession): Promise<Bid>;
    findWinningByAuctionId(auctionId: string, session?: ClientSession): Promise<Bid | null>;
    findAll(page: number, limit: number, filter: BidsFilterInput): Promise<{
        items: Bid[];
        total: number;
    }>;
    findByAuctionId(auctionId: string, page: number, limit: number, filter: BidsFilterInput): Promise<{
        items: Bid[];
        total: number;
    }>;
    findByBidderId(bidderId: string, page: number, limit: number, filter: BidsFilterInput): Promise<{
        items: Bid[];
        total: number;
    }>;
    updateStatus(bidId: string, status: BidStatus, session?: ClientSession): Promise<void>;
    countByAuctionId(auctionId: string): Promise<number>;
}
