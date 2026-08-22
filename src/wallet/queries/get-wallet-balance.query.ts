import { Query } from '@nestjs/cqrs';
import { ClientSession } from 'mongoose';

export class GetWalletBalanceQuery extends Query<{
  balance: string;
  heldBalance: string;
}> {
  constructor(
    readonly userId: string,
    readonly session?: ClientSession,
  ) {
    super();
  }
}
