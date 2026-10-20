import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { BidsService } from './bids.service';
import { AutoBiddingService } from './services/auto-bidding.service';
import { Bid } from './entities/bid.entity';
import { AutoBid } from './entities/auto-bid.entity';
import { AutoBidStatus } from './enums/auto-bid-status.enum';
import { PlaceBidInput } from './dto/place-bid.input';
import { SetAutoBidInput } from './dto/set-auto-bid.input';
import { CancelAutoBidInput } from './dto/cancel-auto-bid.input';
import { BidsFilterInput } from './dto/bids-filter.input';
import { BidsPage } from './dto/bids-page.type';
import { AutoBidsPage } from './dto/auto-bids-page.type';
import { PaginationInput } from '../common/dto/pagination.input';
import { BidAddedPayload } from './dto/bid-added.payload';
import type { RedisPubSub } from 'graphql-redis-subscriptions';
export declare class BidsResolver {
    private readonly bidsService;
    private readonly autoBiddingService;
    private readonly pubSub;
    constructor(bidsService: BidsService, autoBiddingService: AutoBiddingService, pubSub: RedisPubSub);
    amount(bid: Bid): string;
    getAuctionBids(auctionId: string, input: PaginationInput, filter?: BidsFilterInput): Promise<BidsPage>;
    adminBids(input: PaginationInput, filter?: BidsFilterInput): Promise<BidsPage>;
    placeBid(user: JwtPayload, input: PlaceBidInput): Promise<Bid>;
    getMyBids(user: JwtPayload, input: PaginationInput, filter?: BidsFilterInput): Promise<BidsPage>;
    setAutoBid(user: JwtPayload, input: SetAutoBidInput): Promise<AutoBid>;
    cancelAutoBid(user: JwtPayload, input: CancelAutoBidInput): Promise<boolean>;
    getMyAutoBid(user: JwtPayload, auctionId: string): Promise<AutoBid | null>;
    getMyAutoBids(user: JwtPayload, input: PaginationInput, status?: AutoBidStatus): Promise<AutoBidsPage>;
    bidAdded(_auctionId: string): AsyncIterable<{
        bidAdded: BidAddedPayload;
    }>;
}
export declare class AutoBidsResolver {
    maxAmount(autoBid: AutoBid): string;
}
