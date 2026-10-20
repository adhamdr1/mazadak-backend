import { RedisPubSub } from 'graphql-redis-subscriptions';
import { DisputesService } from '../services';
import { Dispute } from '../entities';
import { CreateDisputeInput, ResolveDisputeInput, UpdateDisputeStatusInput, DisputeFilterInput, DisputesPage, DisputeStatusChangedPayload } from '../dto';
import { PaginationInput } from '../../common/dto/pagination.input';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
export declare class DisputesResolver {
    private readonly disputesService;
    private readonly pubSub;
    constructor(disputesService: DisputesService, pubSub: RedisPubSub);
    getDispute(id: string, currentUser: JwtPayload): Promise<Dispute>;
    getDisputeByAuction(auctionId: string, currentUser: JwtPayload): Promise<Dispute | null>;
    getMyDisputes(currentUser: JwtPayload, input?: PaginationInput, filter?: DisputeFilterInput): Promise<DisputesPage>;
    getAllDisputes(input?: PaginationInput, filter?: DisputeFilterInput): Promise<DisputesPage>;
    openDispute(currentUser: JwtPayload, input: CreateDisputeInput): Promise<Dispute>;
    cancelDispute(currentUser: JwtPayload, disputeId: string): Promise<Dispute>;
    updateDisputeStatus(input: UpdateDisputeStatusInput): Promise<Dispute>;
    resolveDispute(currentUser: JwtPayload, input: ResolveDisputeInput): Promise<Dispute>;
    disputeStatusChanged(_disputeId?: string): AsyncIterable<{
        disputeStatusChanged: DisputeStatusChangedPayload;
    }>;
}
