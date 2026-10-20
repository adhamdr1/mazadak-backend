import { IQueryHandler } from '@nestjs/cqrs';
import { GetUserAuctionsCountQuery, UserAuctionsCount } from '../get-user-auctions-count.query';
import { type IAuctionRepository } from '../../interfaces/auction-repository.interface';
export declare class GetUserAuctionsCountHandler implements IQueryHandler<GetUserAuctionsCountQuery, UserAuctionsCount> {
    private readonly auctionRepository;
    constructor(auctionRepository: IAuctionRepository);
    execute(query: GetUserAuctionsCountQuery): Promise<UserAuctionsCount>;
}
