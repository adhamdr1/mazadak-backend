import { ClientSession, Types } from 'mongoose';
import { Dispute } from '../entities/dispute.entity';
import { DisputeStatus } from '../enums/dispute-status.enum';
import { DisputeReason } from '../enums/dispute-reason.enum';
import { DisputeResolution } from '../enums/dispute-resolution.enum';
import { DisputeFilterInput } from '../dto/dispute-filter.input';

export interface CreateDisputeData {
  escrowId: Types.ObjectId;
  auctionId: Types.ObjectId;
  openedById: Types.ObjectId;
  againstUserId: Types.ObjectId;
  reason: DisputeReason;
  description: string;
  evidenceUrls?: string[];
}

export interface UpdateDisputeExtraData {
  adminId?: Types.ObjectId;
  adminDecision?: DisputeResolution;
  adminNotes?: string;
  resolvedAt?: Date;
}

export interface IDisputeRepository {
  startSession(): Promise<ClientSession>;

  create(data: CreateDisputeData, session?: ClientSession): Promise<Dispute>;

  findById(id: string, session?: ClientSession): Promise<Dispute | null>;

  findByEscrowId(
    escrowId: string,
    session?: ClientSession,
  ): Promise<Dispute | null>;

  findByAuctionId(
    auctionId: string,
    session?: ClientSession,
  ): Promise<Dispute | null>;

  updateStatus(
    id: string,
    status: DisputeStatus,
    extra?: UpdateDisputeExtraData,
    session?: ClientSession,
  ): Promise<Dispute | null>;

  findPaginated(
    filter?: DisputeFilterInput,
    page?: number,
    limit?: number,
    session?: ClientSession,
  ): Promise<{ items: Dispute[]; total: number }>;
}
