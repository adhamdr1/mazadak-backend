import { ClientSession, Types } from 'mongoose';
import { Escrow } from '../entities/escrow.entity';
import { EscrowStatus } from '../enums/escrow-status.enum';
import { EscrowFilterInput } from '../dto/escrow-filter.input';

export interface CreateEscrowData {
  auctionId: Types.ObjectId;
  buyerId: Types.ObjectId;
  sellerId: Types.ObjectId;
  amount: Types.Decimal128;
  currency?: string;
  inspectionPeriodEndsAt: Date;
}

export interface UpdateEscrowExtraData {
  releasedAt?: Date;
  refundedAt?: Date;
  releaseReason?: string;
  disputeId?: Types.ObjectId;
}

export interface IEscrowRepository {
  startSession(): Promise<ClientSession>;

  create(data: CreateEscrowData, session?: ClientSession): Promise<Escrow>;

  findById(id: string, session?: ClientSession): Promise<Escrow | null>;

  findByAuctionId(
    auctionId: string,
    session?: ClientSession,
  ): Promise<Escrow | null>;

  findExpiredHeldEscrows(
    now: Date,
    limit?: number,
    session?: ClientSession,
  ): Promise<Escrow[]>;

  updateStatus(
    id: string,
    status: EscrowStatus,
    extra?: UpdateEscrowExtraData,
    session?: ClientSession,
  ): Promise<Escrow | null>;

  findPaginated(
    filter?: EscrowFilterInput,
    page?: number,
    limit?: number,
    session?: ClientSession,
  ): Promise<{ items: Escrow[]; total: number }>;
}
