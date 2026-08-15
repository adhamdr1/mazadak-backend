import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetAuctionByIdQuery } from '../get-auction-by-id.query';
import { type IAuctionRepository } from '../../interfaces/auction-repository.interface';
import { Auction } from '../../entities/auction.entity';

@QueryHandler(GetAuctionByIdQuery)
export class GetAuctionByIdHandler implements IQueryHandler<
  GetAuctionByIdQuery,
  Auction | null
> {
  constructor(
    @Inject('IAuctionRepository')
    private readonly auctionRepository: IAuctionRepository,
  ) {}

  async execute(query: GetAuctionByIdQuery): Promise<Auction | null> {
    return this.auctionRepository.findById(query.auctionId);
  }
}
