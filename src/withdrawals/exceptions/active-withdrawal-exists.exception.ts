import { ConflictException } from '@nestjs/common';

export class ActiveWithdrawalExistsException extends ConflictException {
  constructor() {
    super('ACTIVE_WITHDRAWAL_EXISTS');
  }
}
