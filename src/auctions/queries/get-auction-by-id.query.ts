import { Query } from '@nestjs/cqrs';
import { Auction } from '../entities/auction.entity';

export class GetAuctionByIdQuery extends Query<Auction | null> {
  constructor(readonly auctionId: string) {
    super();
  }
}
