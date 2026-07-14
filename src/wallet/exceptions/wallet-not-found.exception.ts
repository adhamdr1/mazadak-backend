import { NotFoundException } from '@nestjs/common';

export class WalletNotFoundException extends NotFoundException {
  constructor() {
    super('WALLET_NOT_FOUND');
  }
}
