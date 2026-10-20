import { ReviewCriteriaInput } from './review-criteria.input';
export declare class CreateReviewInput {
    auctionId: string;
    overallRating: number;
    criteria?: ReviewCriteriaInput;
    comment?: string;
}
