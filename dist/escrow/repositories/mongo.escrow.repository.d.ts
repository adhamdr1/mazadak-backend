import { Model, ClientSession } from 'mongoose';
import { IEscrowRepository, CreateEscrowData, UpdateEscrowExtraData } from '../interfaces';
import { Escrow, EscrowDocument } from '../entities';
import { UserDocument } from '../../users/entities/user.entity';
import { EscrowStatus } from '../enums';
import { EscrowFilterInput } from '../dto';
export declare class MongoEscrowRepository implements IEscrowRepository {
    private readonly escrowModel;
    private readonly userModel;
    constructor(escrowModel: Model<EscrowDocument>, userModel: Model<UserDocument>);
    startSession(): Promise<ClientSession>;
    create(data: CreateEscrowData, session?: ClientSession): Promise<Escrow>;
    findById(id: string, session?: ClientSession): Promise<Escrow | null>;
    findByAuctionId(auctionId: string, session?: ClientSession): Promise<Escrow | null>;
    findExpiredHeldEscrows(now: Date, limit?: number, session?: ClientSession): Promise<Escrow[]>;
    updateStatus(id: string, status: EscrowStatus, extra?: UpdateEscrowExtraData, session?: ClientSession): Promise<Escrow | null>;
    findPaginated(filter?: EscrowFilterInput, page?: number, limit?: number, session?: ClientSession): Promise<{
        items: Escrow[];
        total: number;
    }>;
    private applySearchFilter;
    sumHeldEscrows(): Promise<number>;
}
