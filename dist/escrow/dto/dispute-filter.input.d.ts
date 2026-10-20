import { DisputeStatus } from '../enums/dispute-status.enum';
export declare class DisputeFilterInput {
    search?: string;
    status?: DisputeStatus;
    userId?: string;
    openedById?: string;
    againstUserId?: string;
    auctionId?: string;
    startDate?: Date;
    endDate?: Date;
}
