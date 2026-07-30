import { BadRequestException } from '@nestjs/common';

export class InvalidAuctionIdException extends BadRequestException {
  constructor() {
    super('Invalid auction ID format');
  }
}
