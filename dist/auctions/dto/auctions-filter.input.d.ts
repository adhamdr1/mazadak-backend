import { AuctionCategory } from '../enums/auction-category.enum';
import { AuctionStatus } from '../enums/auction-status.enum';
import { AuctionsSortInput } from './auctions-sort.input';
export declare class AuctionsFilterInput {
    category?: AuctionCategory;
    status?: AuctionStatus;
    search?: string;
    sort?: AuctionsSortInput;
    startDate?: Date;
    endDate?: Date;
}
