import { Query } from '@nestjs/cqrs';

export interface UserAuctionsCount {
  active: number;
  completed: number;
}

export class GetUserAuctionsCountQuery extends Query<UserAuctionsCount> {
  constructor(readonly userId: string) {
    super();
  }
}
