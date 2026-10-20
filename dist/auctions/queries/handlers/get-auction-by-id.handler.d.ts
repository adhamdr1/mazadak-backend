import { IQueryHandler } from '@nestjs/cqrs';
import { GetAuctionByIdQuery } from '../get-auction-by-id.query';
import { type IAuctionRepository } from '../../interfaces/auction-repository.interface';
import { Auction } from '../../entities/auction.entity';
export declare class GetAuctionByIdHandler implements IQueryHandler<GetAuctionByIdQuery, Auction | null> {
    private readonly auctionRepository;
    constructor(auctionRepository: IAuctionRepository);
    execute(query: GetAuctionByIdQuery): Promise<Auction | null>;
}
