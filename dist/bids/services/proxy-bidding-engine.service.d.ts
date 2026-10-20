import { BidStatus } from '../enums/bid-status.enum';
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
export declare class ProxyBiddingEngineService {
    calculateNextState(auction: AuctionEngineState, activeAutoBids: AutoBidCandidate[], manualBid?: ManualBidCandidate): ProxyEngineResult;
}
