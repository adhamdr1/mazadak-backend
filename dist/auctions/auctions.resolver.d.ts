import { AuctionsService } from './auctions.service';
import { Auction } from './entities/auction.entity';
import { CreateAuctionInput } from './dto/create-auction.input';
import { UpdateAuctionInput } from './dto/update-auction.input';
import { AuctionsFilterInput } from './dto/auctions-filter.input';
import { AuctionsPage } from './dto/auctions-page.type';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PaginationInput } from '../common/dto/pagination.input';
import { AuctionStatusChangedPayload } from './dto/auction-status-changed.payload';
import type { RedisPubSub } from 'graphql-redis-subscriptions';
export declare class AuctionsResolver {
    private readonly auctionsService;
    private readonly pubSub;
    constructor(auctionsService: AuctionsService, pubSub: RedisPubSub);
    getAuctions(input: PaginationInput, filter?: AuctionsFilterInput): Promise<AuctionsPage>;
    adminAuctions(input: PaginationInput, filter?: AuctionsFilterInput): Promise<AuctionsPage>;
    getAuction(id: string): Promise<Auction>;
    getMyAuctions(currentUser: JwtPayload, input: PaginationInput, filter?: AuctionsFilterInput): Promise<AuctionsPage>;
    getMyWonAuctions(currentUser: JwtPayload, input: PaginationInput, filter?: AuctionsFilterInput): Promise<AuctionsPage>;
    getUserAuctions(userId: string, input?: PaginationInput, filter?: AuctionsFilterInput): Promise<AuctionsPage>;
    createAuction(currentUser: JwtPayload, input: CreateAuctionInput): Promise<Auction>;
    updateAuction(currentUser: JwtPayload, id: string, input: UpdateAuctionInput): Promise<Auction>;
    cancelAuction(currentUser: JwtPayload, id: string): Promise<boolean>;
    auctionCreated(): AsyncIterable<{
        auctionCreated: Auction;
    }>;
    auctionStatusChanged(_id?: string): AsyncIterable<{
        auctionStatusChanged: AuctionStatusChangedPayload;
    }>;
}
