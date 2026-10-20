import { Query } from '@nestjs/cqrs';
import { Auction } from '../entities/auction.entity';
export declare class GetAuctionByIdQuery extends Query<Auction | null> {
    readonly auctionId: string;
    constructor(auctionId: string);
}
