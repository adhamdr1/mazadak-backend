import { Query } from '@nestjs/cqrs';

export class GetWalletBalanceQuery extends Query<{
  balance: string;
  heldBalance: string;
}> {
  constructor(readonly userId: string) {
    super();
  }
}
