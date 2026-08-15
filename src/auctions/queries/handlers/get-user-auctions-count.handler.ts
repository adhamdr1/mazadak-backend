import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  GetUserAuctionsCountQuery,
  UserAuctionsCount,
} from '../get-user-auctions-count.query';
import { type IAuctionRepository } from '../../interfaces/auction-repository.interface';

@QueryHandler(GetUserAuctionsCountQuery)
export class GetUserAuctionsCountHandler implements IQueryHandler<
  GetUserAuctionsCountQuery,
  UserAuctionsCount
> {
  constructor(
    @Inject('IAuctionRepository')
    private readonly auctionRepository: IAuctionRepository,
  ) {}

  async execute(query: GetUserAuctionsCountQuery): Promise<UserAuctionsCount> {
    return this.auctionRepository.countUserAuctions(query.userId);
  }
}
