import { NotFoundException } from '@nestjs/common';

export class AutoBidNotFoundException extends NotFoundException {
  constructor() {
    super('No active auto-bid configuration found for this auction');
  }
}
