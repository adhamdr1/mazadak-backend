import { EscrowStatus } from '../enums/escrow-status.enum';
export declare class EscrowFilterInput {
    search?: string;
    excludeDisputed?: boolean;
    status?: EscrowStatus;
    userId?: string;
    buyerId?: string;
    sellerId?: string;
    auctionId?: string;
    startDate?: Date;
    endDate?: Date;
}
