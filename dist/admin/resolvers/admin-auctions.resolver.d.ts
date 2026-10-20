import { AuctionsService } from '../../auctions/auctions.service';
import { AuctionsPage } from '../../auctions/dto/auctions-page.type';
import { PaginationInput } from '../../common/dto/pagination.input';
import { AuctionsFilterInput } from '../../auctions/dto/auctions-filter.input';
export declare class AdminAuctionsResolver {
    private readonly auctionsService;
    constructor(auctionsService: AuctionsService);
    adminGetAuctions(input: PaginationInput, filter: AuctionsFilterInput): Promise<AuctionsPage>;
    adminCancelAuction(auctionId: string, reason: string): Promise<boolean>;
}
