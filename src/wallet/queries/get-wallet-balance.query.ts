import { Query } from '@nestjs/cqrs';

export class GetWalletBalanceQuery extends Query<{
  balance: number;
  heldBalance: number;
}> {
  constructor(readonly userId: string) {
    super();
  }
}
