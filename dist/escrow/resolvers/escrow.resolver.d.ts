import { QueryBus } from '@nestjs/cqrs';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { EscrowService } from '../services';
import { Escrow } from '../entities';
import { EscrowsPage, EscrowFilterInput, EscrowStatusChangedPayload } from '../dto';
import { PaginationInput } from '../../common/dto/pagination.input';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { Auction } from '../../auctions/entities/auction.entity';
export declare class EscrowResolver {
    private readonly escrowService;
    private readonly queryBus;
    private readonly pubSub;
    constructor(escrowService: EscrowService, queryBus: QueryBus, pubSub: RedisPubSub);
    auction(escrow: Escrow): Promise<Auction | null>;
    inspectionDurationHours(): number;
    getEscrowByAuction(auctionId: string, currentUser: JwtPayload): Promise<Escrow | null>;
    getEscrow(id: string, currentUser: JwtPayload): Promise<Escrow>;
    getMyEscrows(currentUser: JwtPayload, input?: PaginationInput, filter?: EscrowFilterInput): Promise<EscrowsPage>;
    getAllEscrows(input?: PaginationInput, filter?: EscrowFilterInput): Promise<EscrowsPage>;
    confirmDelivery(currentUser: JwtPayload, escrowId: string): Promise<Escrow>;
    releaseEscrow(escrowId: string, reason?: string): Promise<Escrow>;
    refundEscrow(escrowId: string, reason?: string): Promise<Escrow>;
    escrowStatusChanged(_escrowId: string): AsyncIterable<{
        escrowStatusChanged: EscrowStatusChangedPayload;
    }>;
}
