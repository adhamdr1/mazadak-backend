import { DisputeResolution } from '../enums/dispute-resolution.enum';
export declare class ResolveDisputeInput {
    disputeId: string;
    decision: DisputeResolution;
    adminNotes?: string;
}
