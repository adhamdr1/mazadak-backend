import { AutoBidStatus } from '../enums/auto-bid-status.enum';
export declare class AutoBidType {
    id: string;
    auctionId: string;
    userId: string;
    maxAmount: number;
    status: AutoBidStatus;
    createdAt: Date;
    updatedAt: Date;
}
