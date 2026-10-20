import { Bid } from '../entities/bid.entity';
export declare class BidAddedPayload {
    bid: Bid;
    currentPrice: number;
    leadingBidderId: string;
    bidCount: number;
}
