import { BadRequestException } from '@nestjs/common';

export class WalletHasBalanceException extends BadRequestException {
  constructor() {
    super('WALLET_HAS_BALANCE');
  }
}
