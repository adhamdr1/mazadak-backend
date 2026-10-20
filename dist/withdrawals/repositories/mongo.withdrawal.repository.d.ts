import { Model, ClientSession } from 'mongoose';
import { IWithdrawalRepository, CreateWithdrawalData } from '../interfaces/withdrawal.repository.interface';
import { WithdrawalRequest, WithdrawalRequestDocument } from '../entities/withdrawal-request.entity';
import { WithdrawalStatus } from '../enums/withdrawal-status.enum';
import { WithdrawalsFilterInput, WithdrawalsPage } from '../dto';
import { PaginationInput } from '../../common/dto/pagination.input';
export declare class MongoWithdrawalRepository implements IWithdrawalRepository {
    private readonly withdrawalModel;
    constructor(withdrawalModel: Model<WithdrawalRequestDocument>);
    private getTodayDateInCairo;
    private queryPaginated;
    create(data: CreateWithdrawalData, session?: ClientSession): Promise<WithdrawalRequest>;
    findById(id: string, session?: ClientSession): Promise<WithdrawalRequest | null>;
    findByUserId(userId: string, pagination: PaginationInput, filter?: WithdrawalsFilterInput, session?: ClientSession): Promise<WithdrawalsPage>;
    findAll(pagination: PaginationInput, filter?: WithdrawalsFilterInput, session?: ClientSession): Promise<WithdrawalsPage>;
    updateStatus(id: string, status: WithdrawalStatus, extra?: Partial<WithdrawalRequest>, session?: ClientSession): Promise<WithdrawalRequest | null>;
    transitionStatus(id: string, fromStatuses: WithdrawalStatus[], toStatus: WithdrawalStatus, extra?: Partial<WithdrawalRequest>, session?: ClientSession, filter?: {
        userId?: string;
    }): Promise<WithdrawalRequest | null>;
    hasActivePendingRequest(userId: string, session?: ClientSession): Promise<boolean>;
    hasRequestToday(userId: string, session?: ClientSession): Promise<boolean>;
    countPendingWithdrawals(session?: ClientSession): Promise<number>;
    sumPendingWithdrawals(session?: ClientSession): Promise<number>;
    sumCompletedWithdrawals(session?: ClientSession): Promise<number>;
    sumCollectedFees(session?: ClientSession): Promise<number>;
}
