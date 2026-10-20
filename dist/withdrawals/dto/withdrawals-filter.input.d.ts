import { WithdrawalStatus } from '../enums/withdrawal-status.enum';
import { PayoutMethod } from '../enums/payout-method.enum';
import { SortOrder } from '../../common/enums/sort-order.enum';
export declare class WithdrawalsFilterInput {
    search?: string;
    userId?: string;
    status?: WithdrawalStatus;
    payoutMethod?: PayoutMethod;
    sortOrder?: SortOrder;
    startDate?: Date;
    endDate?: Date;
}
