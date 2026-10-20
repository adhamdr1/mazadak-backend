import { WithdrawalsService } from '../../withdrawals/withdrawals.service';
import { WithdrawalRequest } from '../../withdrawals/entities/withdrawal-request.entity';
import { WithdrawalsPage, WithdrawalsFilterInput } from '../../withdrawals/dto';
import { AdminCompleteWithdrawalInput, AdminRejectWithdrawalInput } from '../dto';
import { PaginationInput } from '../../common/dto/pagination.input';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import type { RedisPubSub } from 'graphql-redis-subscriptions';
export declare class AdminWithdrawalsResolver {
    private readonly withdrawalsService;
    private readonly pubSub;
    constructor(withdrawalsService: WithdrawalsService, pubSub: RedisPubSub);
    adminGetWithdrawals(pagination: PaginationInput, filter?: WithdrawalsFilterInput): Promise<WithdrawalsPage>;
    adminGetWithdrawal(id: string): Promise<WithdrawalRequest>;
    adminStartWithdrawalProcessing(admin: JwtPayload, requestId: string): Promise<WithdrawalRequest>;
    adminCompleteWithdrawal(admin: JwtPayload, input: AdminCompleteWithdrawalInput): Promise<WithdrawalRequest>;
    adminRejectWithdrawal(admin: JwtPayload, input: AdminRejectWithdrawalInput): Promise<WithdrawalRequest>;
    adminWithdrawalFeed(user?: JwtPayload): AsyncIterable<{
        withdrawalRequested?: WithdrawalRequest;
        withdrawalStatusChanged?: WithdrawalRequest;
    }>;
}
