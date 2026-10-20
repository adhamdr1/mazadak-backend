import { ClientSession, Connection } from 'mongoose';
import type { IEscrowRepository } from '../interfaces';
import { Escrow } from '../entities';
import { EscrowFilterInput, EscrowsPage } from '../dto';
import { PaginationInput } from '../../common/dto/pagination.input';
import { WalletService } from '../../wallet/wallet.service';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import { RealtimeService } from '../../infrastructure/pubsub/realtime.service';
import { TransactionReferenceType } from '../../transaction/enums/transaction-reference-type.enum';
export declare const INSPECTION_WINDOW_DAYS = 7;
export declare class EscrowService {
    private readonly escrowRepository;
    private readonly walletService;
    private readonly outboxService;
    private readonly realtimeService;
    private readonly connection;
    private readonly logger;
    constructor(escrowRepository: IEscrowRepository, walletService: WalletService, outboxService: OutboxService, realtimeService: RealtimeService, connection: Connection);
    createEscrow(params: {
        auctionId: string;
        buyerId: string;
        sellerId: string;
        amount: number;
        currency?: string;
    }, session?: ClientSession): Promise<Escrow>;
    confirmDelivery(buyerId: string, escrowId: string): Promise<Escrow>;
    releaseEscrow(escrowId: string, releaseReason: string, session?: ClientSession, referenceType?: TransactionReferenceType, referenceId?: string): Promise<Escrow>;
    refundEscrow(escrowId: string, refundReason: string, session?: ClientSession, referenceType?: TransactionReferenceType, referenceId?: string): Promise<Escrow>;
    getEscrowById(id: string): Promise<Escrow>;
    getEscrowByAuctionId(auctionId: string): Promise<Escrow | null>;
    getMyEscrows(userId: string, input?: PaginationInput, filter?: EscrowFilterInput): Promise<EscrowsPage>;
    getAllEscrows(input?: PaginationInput, filter?: EscrowFilterInput): Promise<EscrowsPage>;
    releaseExpiredHeldEscrows(limit?: number): Promise<number>;
    sumHeldEscrows(): Promise<number>;
}
