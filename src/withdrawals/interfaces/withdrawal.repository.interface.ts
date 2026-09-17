import { ClientSession, Types } from 'mongoose';
import { WithdrawalRequest } from '../entities/withdrawal-request.entity';
import { WithdrawalStatus } from '../enums/withdrawal-status.enum';
import { PayoutMethod } from '../enums/payout-method.enum';
import {
  PayoutDetailsInput,
  WithdrawalsFilterInput,
  WithdrawalsPage,
} from '../dto';
import { PaginationInput } from '../../common/dto/pagination.input';

export interface CreateWithdrawalData {
  userId: Types.ObjectId | string;
  amount: number;
  fee: number;
  feePercentage: number;
  netAmount: number;
  currency?: string;
  payoutMethod: PayoutMethod;
  payoutDetails: PayoutDetailsInput;
  status?: WithdrawalStatus;
  holdTransactionId?: Types.ObjectId;
  requestDate?: string;
}

export interface IWithdrawalRepository {
  create(
    data: CreateWithdrawalData,
    session?: ClientSession,
  ): Promise<WithdrawalRequest>;

  findById(
    id: string,
    session?: ClientSession,
  ): Promise<WithdrawalRequest | null>;

  findByUserId(
    userId: string,
    pagination: PaginationInput,
    filter?: WithdrawalsFilterInput,
    session?: ClientSession,
  ): Promise<WithdrawalsPage>;

  findAll(
    pagination: PaginationInput,
    filter?: WithdrawalsFilterInput,
    session?: ClientSession,
  ): Promise<WithdrawalsPage>;

  updateStatus(
    id: string,
    status: WithdrawalStatus,
    extra?: Partial<WithdrawalRequest>,
    session?: ClientSession,
  ): Promise<WithdrawalRequest | null>;

  transitionStatus(
    id: string,
    fromStatuses: WithdrawalStatus[],
    toStatus: WithdrawalStatus,
    extra?: Partial<WithdrawalRequest>,
    session?: ClientSession,
    filter?: { userId?: string },
  ): Promise<WithdrawalRequest | null>;

  hasActivePendingRequest(
    userId: string,
    session?: ClientSession,
  ): Promise<boolean>;

  hasRequestToday(userId: string, session?: ClientSession): Promise<boolean>;

  countPendingWithdrawals(session?: ClientSession): Promise<number>;

  sumPendingWithdrawals(session?: ClientSession): Promise<number>;

  sumCompletedWithdrawals(session?: ClientSession): Promise<number>;

  sumCollectedFees(session?: ClientSession): Promise<number>;
}
