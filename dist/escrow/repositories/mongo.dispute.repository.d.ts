import { Model, ClientSession } from 'mongoose';
import { IDisputeRepository, CreateDisputeData, UpdateDisputeExtraData } from '../interfaces';
import { Dispute, DisputeDocument } from '../entities';
import { UserDocument } from '../../users/entities/user.entity';
import { DisputeStatus } from '../enums';
import { DisputeFilterInput } from '../dto';
export declare class MongoDisputeRepository implements IDisputeRepository {
    private readonly disputeModel;
    private readonly userModel;
    constructor(disputeModel: Model<DisputeDocument>, userModel: Model<UserDocument>);
    startSession(): Promise<ClientSession>;
    create(data: CreateDisputeData, session?: ClientSession): Promise<Dispute>;
    findById(id: string, session?: ClientSession): Promise<Dispute | null>;
    findByEscrowId(escrowId: string, session?: ClientSession): Promise<Dispute | null>;
    findByAuctionId(auctionId: string, session?: ClientSession): Promise<Dispute | null>;
    updateStatus(id: string, status: DisputeStatus, extra?: UpdateDisputeExtraData, session?: ClientSession): Promise<Dispute | null>;
    findPaginated(filter?: DisputeFilterInput, page?: number, limit?: number, session?: ClientSession): Promise<{
        items: Dispute[];
        total: number;
    }>;
    private applySearchFilter;
}
