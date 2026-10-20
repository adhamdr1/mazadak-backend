import { AuctionCategory } from '../enums/auction-category.enum';
export declare class CreateAuctionInput {
    title: string;
    description: string;
    category: AuctionCategory;
    startingPrice: number;
    minimumBidIncrement: number;
    images: string[];
    startTime: Date;
    endTime: Date;
}
