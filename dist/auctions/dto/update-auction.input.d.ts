import { AuctionCategory } from '../enums/auction-category.enum';
export declare class UpdateAuctionInput {
    title?: string;
    description?: string;
    category?: AuctionCategory;
    images?: string[];
    startTime?: Date;
    endTime?: Date;
}
