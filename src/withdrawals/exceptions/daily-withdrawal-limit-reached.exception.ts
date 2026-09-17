import { BadRequestException } from '@nestjs/common';

export class DailyWithdrawalLimitReachedException extends BadRequestException {
  constructor() {
    super('DAILY_WITHDRAWAL_LIMIT_REACHED');
  }
}
