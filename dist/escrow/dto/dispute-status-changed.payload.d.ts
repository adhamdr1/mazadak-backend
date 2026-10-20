import { DisputeStatus } from '../enums/dispute-status.enum';
import { DisputeResolution } from '../enums/dispute-resolution.enum';
export declare class DisputeStatusChangedPayload {
    disputeId: string;
    escrowId: string;
    auctionId: string;
    status: DisputeStatus;
    adminDecision?: DisputeResolution;
    adminNotes?: string;
    resolvedAt?: Date;
}
export interface DisputeStatusChangedInternalPayload extends DisputeStatusChangedPayload {
    openedById: string;
    againstUserId: string;
}
