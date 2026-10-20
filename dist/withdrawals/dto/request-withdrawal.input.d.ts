import { PayoutMethod } from '../enums/payout-method.enum';
import { PayoutDetailsInput } from './payout-details.input';
export declare class RequestWithdrawalInput {
    amount: number;
    payoutMethod: PayoutMethod;
    payoutDetails: PayoutDetailsInput;
}
