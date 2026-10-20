import { DisputeReason } from '../enums/dispute-reason.enum';
export declare class CreateDisputeInput {
    auctionId: string;
    reason: DisputeReason;
    description: string;
    evidenceUrls: string[];
}
