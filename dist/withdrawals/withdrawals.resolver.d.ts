import { WithdrawalsService } from './withdrawals.service';
import { WithdrawalRequest } from './entities/withdrawal-request.entity';
import { PayoutMethod } from './enums/payout-method.enum';
import { RequestWithdrawalInput, WithdrawalsFilterInput, WithdrawalsPage, WithdrawalFeePreview } from './dto';
import { PaginationInput } from '../common/dto/pagination.input';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import type { RedisPubSub } from 'graphql-redis-subscriptions';
export declare class WithdrawalsResolver {
    private readonly withdrawalsService;
    private readonly pubSub;
    constructor(withdrawalsService: WithdrawalsService, pubSub: RedisPubSub);
    withdrawalFeePreview(amount: number, payoutMethod: PayoutMethod): WithdrawalFeePreview;
    myWithdrawals(currentUser: JwtPayload, pagination: PaginationInput, filter?: WithdrawalsFilterInput): Promise<WithdrawalsPage>;
    myWithdrawal(currentUser: JwtPayload, id: string): Promise<WithdrawalRequest>;
    requestWithdrawal(currentUser: JwtPayload, input: RequestWithdrawalInput): Promise<WithdrawalRequest>;
    cancelWithdrawal(currentUser: JwtPayload, id: string): Promise<WithdrawalRequest>;
    myWithdrawalUpdated(user: JwtPayload): AsyncIterable<{
        withdrawalStatusChanged: WithdrawalRequest;
    }>;
}
