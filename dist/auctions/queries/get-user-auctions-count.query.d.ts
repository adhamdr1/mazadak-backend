import { Query } from '@nestjs/cqrs';
export interface UserAuctionsCount {
    active: number;
    completed: number;
}
export declare class GetUserAuctionsCountQuery extends Query<UserAuctionsCount> {
    readonly userId: string;
    constructor(userId: string);
}
