import { Connection } from 'mongoose';
import type { IDisputeRepository, IEscrowRepository } from '../interfaces';
import { Dispute } from '../entities';
import { CreateDisputeInput, ResolveDisputeInput, UpdateDisputeStatusInput, DisputeFilterInput, DisputesPage } from '../dto';
import { PaginationInput } from '../../common/dto/pagination.input';
import { EscrowService } from './escrow.service';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import { RealtimeService } from '../../infrastructure/pubsub/realtime.service';
export declare class DisputesService {
    private readonly disputeRepository;
    private readonly escrowRepository;
    private readonly escrowService;
    private readonly outboxService;
    private readonly realtimeService;
    private readonly connection;
    private readonly logger;
    constructor(disputeRepository: IDisputeRepository, escrowRepository: IEscrowRepository, escrowService: EscrowService, outboxService: OutboxService, realtimeService: RealtimeService, connection: Connection);
    openDispute(userId: string, input: CreateDisputeInput): Promise<Dispute>;
    cancelDispute(userId: string, disputeId: string): Promise<Dispute>;
    updateDisputeStatus(input: UpdateDisputeStatusInput): Promise<Dispute>;
    resolveDispute(adminId: string, input: ResolveDisputeInput): Promise<Dispute>;
    getDisputeById(id: string): Promise<Dispute>;
    getDisputeByEscrowId(escrowId: string): Promise<Dispute | null>;
    getDisputeByAuctionId(auctionId: string): Promise<Dispute | null>;
    getMyDisputes(userId: string, input?: PaginationInput, filter?: DisputeFilterInput): Promise<DisputesPage>;
    getAllDisputes(input?: PaginationInput, filter?: DisputeFilterInput): Promise<DisputesPage>;
}
