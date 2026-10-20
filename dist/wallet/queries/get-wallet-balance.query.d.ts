import { Query } from '@nestjs/cqrs';
import { ClientSession } from 'mongoose';
export declare class GetWalletBalanceQuery extends Query<{
    balance: string;
    heldBalance: string;
}> {
    readonly userId: string;
    readonly session?: ClientSession | undefined;
    constructor(userId: string, session?: ClientSession | undefined);
}
