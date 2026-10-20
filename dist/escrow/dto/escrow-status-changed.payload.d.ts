import { EscrowStatus } from '../enums/escrow-status.enum';
export declare class EscrowStatusChangedPayload {
    escrowId: string;
    auctionId: string;
    status: EscrowStatus;
    releasedAt?: Date;
    refundedAt?: Date;
    disputeId?: string;
    releaseReason?: string;
}
export interface EscrowStatusChangedInternalPayload extends EscrowStatusChangedPayload {
    buyerId: string;
    sellerId: string;
}
