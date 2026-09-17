import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import Decimal from 'decimal.js';
import type { IWithdrawalRepository } from './interfaces/withdrawal.repository.interface';
import { WithdrawalRequest } from './entities/withdrawal-request.entity';
import { WithdrawalStatus } from './enums/withdrawal-status.enum';
import { PayoutMethod } from './enums/payout-method.enum';
import {
  RequestWithdrawalInput,
  WithdrawalsFilterInput,
  WithdrawalsPage,
  WithdrawalFeePreview,
} from './dto';
import {
  AdminCompleteWithdrawalInput,
  AdminRejectWithdrawalInput,
  AdminAdjustBalanceInput,
  AdminAdjustBalanceType,
} from '../admin/dto';
import { PaginationInput } from '../common/dto/pagination.input';
import { WalletService } from '../wallet/wallet.service';
import { Wallet } from '../wallet/entities/wallet.entity';
import { OutboxService } from '../infrastructure/outbox/outbox.service';
import { RealtimeService } from '../infrastructure/pubsub/realtime.service';
import { RabbitMQEvent } from '../infrastructure/rabbitmq/rabbitmq-event.types';
import { TransactionReferenceType } from '../transaction/enums/transaction-reference-type.enum';
import { InsufficientFundsException } from '../wallet/exceptions/insufficient-funds.exception';
import {
  WithdrawalNotFoundException,
  WithdrawalNotCancellableException,
  WithdrawalBelowMinimumException,
  DailyWithdrawalLimitReachedException,
  PayoutMethodAmountExceededException,
  WithdrawalNotPendingException,
  WithdrawalNotInProgressException,
  WithdrawalNotRejectableException,
} from './exceptions';

@Injectable()
export class WithdrawalsService {
  private readonly logger = new Logger(WithdrawalsService.name);

  constructor(
    @Inject('IWithdrawalRepository')
    private readonly withdrawalRepository: IWithdrawalRepository,
    private readonly walletService: WalletService,
    private readonly outboxService: OutboxService,
    private readonly realtimeService: RealtimeService,
    private readonly configService: ConfigService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private getTodayDateInCairo(date: Date = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  // ─── Fee Preview & Estimation ──────────────────────────────────────────────────

  calculateFee(
    amount: number,
    payoutMethod: PayoutMethod,
  ): WithdrawalFeePreview {
    const feePercentage = this.configService.get<number>(
      'WITHDRAWAL_FEE_PERCENTAGE',
      2,
    );
    const amountDec = new Decimal(amount || 0);
    const feeDec = amountDec.times(feePercentage).dividedBy(100);
    const netAmountDec = amountDec.minus(feeDec);

    const maxAllowed =
      payoutMethod === PayoutMethod.BANK_ACCOUNT ? 10_000_000 : 50_000;

    const estimatedDelivery =
      payoutMethod === PayoutMethod.BANK_ACCOUNT
        ? '3-5 business days'
        : 'Within 24 business hours';

    return {
      requestedAmount: amountDec.toFixed(2),
      fee: feeDec.toFixed(2),
      feePercentage,
      netAmount: netAmountDec.toFixed(2),
      maxAllowed,
      estimatedDelivery,
    };
  }

  // ─── User-Facing Operations ──────────────────────────────────────────────────

  async requestWithdrawal(
    userId: string,
    input: RequestWithdrawalInput,
  ): Promise<WithdrawalRequest> {
    // 1. Minimum limit check (50 EGP)
    if (input.amount < 50) {
      throw new WithdrawalBelowMinimumException();
    }

    // 2. Smart tiering limit check: Bank up to 10M, Wallets/InstaPay up to 50k
    const maxAllowed =
      input.payoutMethod === PayoutMethod.BANK_ACCOUNT ? 10_000_000 : 50_000;
    if (input.amount > maxAllowed) {
      throw new PayoutMethodAmountExceededException(
        `WITHDRAWAL_EXCEEDS_MAX_FOR_${input.payoutMethod}`,
      );
    }

    // 3. Check wallet available balance (balance - heldBalance)
    const wallet = await this.walletService.getMyWallet(userId);
    const balance = new Decimal(
      wallet.balance ? wallet.balance.toString() : '0',
    );
    const held = new Decimal(
      wallet.heldBalance ? wallet.heldBalance.toString() : '0',
    );
    const available = balance.minus(held);

    if (available.lessThan(input.amount)) {
      throw new InsufficientFundsException();
    }

    // 4. Check Daily Limit (1 active/completed request per calendar day in Cairo timezone)
    const hasToday = await this.withdrawalRepository.hasRequestToday(userId);
    if (hasToday) {
      throw new DailyWithdrawalLimitReachedException();
    }

    // 5. Calculate Fee and Net Amount with Decimal precision
    const feePercentage = this.configService.get<number>(
      'WITHDRAWAL_FEE_PERCENTAGE',
      2,
    );
    const fee = new Decimal(input.amount)
      .times(feePercentage)
      .dividedBy(100)
      .toNumber();
    const netAmount = new Decimal(input.amount).minus(fee).toNumber();

    // 6. Atomic Transactional Execution
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // Hold funds in user wallet ledger
      const { transaction: holdTx } = await this.walletService.hold(
        userId,
        input.amount,
        undefined,
        session,
        TransactionReferenceType.WITHDRAWAL,
      );

      const requestDate = this.getTodayDateInCairo();

      // Create withdrawal request entity
      const withdrawalRequest = await this.withdrawalRepository.create(
        {
          userId,
          amount: input.amount,
          fee,
          feePercentage,
          netAmount,
          currency: 'EGP',
          payoutMethod: input.payoutMethod,
          payoutDetails: input.payoutDetails,
          status: WithdrawalStatus.PENDING,
          holdTransactionId: new Types.ObjectId(holdTx._id.toString()),
          requestDate,
        },
        session,
      );

      // Save Outbox Event for durable notification dispatch
      await this.outboxService.saveEvent(
        RabbitMQEvent.WithdrawalRequested,
        {
          userId,
          amount: input.amount,
          netAmount,
          fee,
          payoutMethod: input.payoutMethod,
          estimatedDelivery:
            input.payoutMethod === PayoutMethod.BANK_ACCOUNT
              ? '3-5 business days'
              : 'Within 24 business hours',
          withdrawalId: withdrawalRequest._id.toString(),
        },
        session,
        withdrawalRequest._id.toString(),
      );

      await session.commitTransaction();

      // Broadcast real-time Live Admin Feed update
      void this.realtimeService.publishWithdrawalRequested(withdrawalRequest);

      return withdrawalRequest;
    } catch (error: unknown) {
      await session.abortTransaction();
      const err = error as { code?: number };
      if (err?.code === 11000) {
        throw new DailyWithdrawalLimitReachedException();
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async cancelWithdrawal(
    userId: string,
    requestId: string,
  ): Promise<WithdrawalRequest> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // Atomically transition status from PENDING to CANCELLED within the transaction
      const updated = await this.withdrawalRepository.transitionStatus(
        requestId,
        [WithdrawalStatus.PENDING],
        WithdrawalStatus.CANCELLED,
        {},
        session,
      );

      if (!updated) {
        const existing = await this.withdrawalRepository.findById(
          requestId,
          session,
        );
        if (!existing) {
          throw new WithdrawalNotFoundException();
        }
        throw new WithdrawalNotCancellableException();
      }

      if (updated.userId.toString() !== userId) {
        throw new WithdrawalNotCancellableException();
      }

      const amountToRelease = new Decimal(updated.amount.toString()).toNumber();

      // Release held balance back to user's available wallet balance
      await this.walletService.release(
        userId,
        amountToRelease,
        requestId,
        session,
        TransactionReferenceType.WITHDRAWAL,
      );

      await session.commitTransaction();

      // Broadcast real-time status change to user and admin
      void this.realtimeService.publishWithdrawalStatusChanged(updated);

      return updated;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async getMyWithdrawals(
    userId: string,
    pagination: PaginationInput,
    filter?: WithdrawalsFilterInput,
  ): Promise<WithdrawalsPage> {
    return this.withdrawalRepository.findByUserId(userId, pagination, filter);
  }

  async getMyWithdrawal(
    userId: string,
    id: string,
  ): Promise<WithdrawalRequest> {
    const request = await this.withdrawalRepository.findById(id);
    if (!request || request.userId.toString() !== userId) {
      throw new WithdrawalNotFoundException();
    }
    return request;
  }

  // ─── Admin-Facing Operations ─────────────────────────────────────────────────

  async adminGetWithdrawals(
    pagination: PaginationInput,
    filter?: WithdrawalsFilterInput,
  ): Promise<WithdrawalsPage> {
    return this.withdrawalRepository.findAll(pagination, filter);
  }

  async adminGetWithdrawal(id: string): Promise<WithdrawalRequest> {
    const request = await this.withdrawalRepository.findById(id);
    if (!request) {
      throw new WithdrawalNotFoundException();
    }
    return request;
  }

  async adminStartProcessing(
    adminId: string,
    requestId: string,
  ): Promise<WithdrawalRequest> {
    // Atomically transition from PENDING to PROCESSING
    const updated = await this.withdrawalRepository.transitionStatus(
      requestId,
      [WithdrawalStatus.PENDING],
      WithdrawalStatus.PROCESSING,
      {
        processedBy: new Types.ObjectId(adminId),
        processedAt: new Date(),
      },
    );

    if (!updated) {
      const existing = await this.withdrawalRepository.findById(requestId);
      if (!existing) {
        throw new WithdrawalNotFoundException();
      }
      throw new WithdrawalNotPendingException();
    }

    void this.realtimeService.publishWithdrawalStatusChanged(updated);

    return updated;
  }

  async adminCompleteWithdrawal(
    adminId: string,
    input: AdminCompleteWithdrawalInput,
  ): Promise<WithdrawalRequest> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // Atomically transition status from PROCESSING or PENDING to COMPLETED
      const updated = await this.withdrawalRepository.transitionStatus(
        input.withdrawalId,
        [WithdrawalStatus.PROCESSING, WithdrawalStatus.PENDING],
        WithdrawalStatus.COMPLETED,
        {
          adminReference: input.adminReference,
          receiptUrl: input.receiptUrl,
          completedAt: new Date(),
          processedBy: new Types.ObjectId(adminId),
        },
        session,
      );

      if (!updated) {
        const existing = await this.withdrawalRepository.findById(
          input.withdrawalId,
          session,
        );
        if (!existing) {
          throw new WithdrawalNotFoundException();
        }
        throw new WithdrawalNotInProgressException();
      }

      const amountToCapture = new Decimal(updated.amount.toString()).toNumber();
      const netAmountNum = new Decimal(updated.netAmount.toString()).toNumber();

      // Settle and permanently capture held funds in wallet ledger
      const { transaction: captureTx } = await this.walletService.capture(
        updated.userId.toString(),
        amountToCapture,
        input.withdrawalId,
        session,
        TransactionReferenceType.WITHDRAWAL,
      );

      // Link capture transaction ID to withdrawal record
      const finalUpdated = await this.withdrawalRepository.updateStatus(
        input.withdrawalId,
        WithdrawalStatus.COMPLETED,
        {
          completionTransactionId: new Types.ObjectId(captureTx._id.toString()),
        },
        session,
      );

      const result = finalUpdated ?? updated;

      // Save Outbox Event with full rich receipt payload
      await this.outboxService.saveEvent(
        RabbitMQEvent.WithdrawalCompleted,
        {
          userId: result.userId.toString(),
          amount: amountToCapture,
          netAmount: netAmountNum,
          transactionId: captureTx._id.toString(),
          adminReference: input.adminReference,
          receiptUrl: input.receiptUrl,
          payoutMethod: result.payoutMethod,
          withdrawalId: result._id.toString(),
        },
        session,
        result._id.toString(),
      );

      await session.commitTransaction();

      // Broadcast real-time update
      void this.realtimeService.publishWithdrawalStatusChanged(result);

      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async adminRejectWithdrawal(
    adminId: string,
    input: AdminRejectWithdrawalInput,
  ): Promise<WithdrawalRequest> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // Atomically transition status from PENDING or PROCESSING to REJECTED
      const updated = await this.withdrawalRepository.transitionStatus(
        input.withdrawalId,
        [WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING],
        WithdrawalStatus.REJECTED,
        {
          rejectionReason: input.rejectionReason,
          processedBy: new Types.ObjectId(adminId),
          processedAt: new Date(),
        },
        session,
      );

      if (!updated) {
        const existing = await this.withdrawalRepository.findById(
          input.withdrawalId,
          session,
        );
        if (!existing) {
          throw new WithdrawalNotFoundException();
        }
        throw new WithdrawalNotRejectableException();
      }

      const amountToRelease = new Decimal(updated.amount.toString()).toNumber();

      // Release held funds back to user wallet ledger
      await this.walletService.release(
        updated.userId.toString(),
        amountToRelease,
        input.withdrawalId,
        session,
        TransactionReferenceType.WITHDRAWAL,
      );

      // Save Outbox Event for rejection notification and email
      await this.outboxService.saveEvent(
        RabbitMQEvent.WithdrawalRejected,
        {
          userId: updated.userId.toString(),
          amount: amountToRelease,
          withdrawalId: updated._id.toString(),
          rejectionReason: input.rejectionReason,
        },
        session,
        updated._id.toString(),
      );

      await session.commitTransaction();

      // Broadcast real-time update
      void this.realtimeService.publishWithdrawalStatusChanged(updated);

      return updated;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async adminAdjustBalance(
    adminId: string,
    input: AdminAdjustBalanceInput,
  ): Promise<Wallet> {
    const reasonTag = `ADMIN_ADJUST:${adminId}:${input.reason}`;

    if (input.type === AdminAdjustBalanceType.CREDIT) {
      const { wallet } = await this.walletService.deposit(
        input.userId,
        input.amount,
        reasonTag,
        undefined,
        'EGP',
        TransactionReferenceType.TRANSACTION,
      );
      this.logger.log(
        `Admin ${adminId} CREDITED ${input.amount} EGP to User ${input.userId}. Reason: ${input.reason}`,
      );
      return wallet;
    } else {
      const { wallet } = await this.walletService.withdraw(
        input.userId,
        input.amount,
        reasonTag,
        undefined,
        TransactionReferenceType.TRANSACTION,
      );
      this.logger.log(
        `Admin ${adminId} DEBITED ${input.amount} EGP from User ${input.userId}. Reason: ${input.reason}`,
      );
      return wallet;
    }
  }

  // ─── Treasury & Financial Statistics ─────────────────────────────────────────

  async countPendingWithdrawals(): Promise<number> {
    return this.withdrawalRepository.countPendingWithdrawals();
  }

  async sumPendingWithdrawals(): Promise<number> {
    return this.withdrawalRepository.sumPendingWithdrawals();
  }

  async sumCompletedWithdrawals(): Promise<number> {
    return this.withdrawalRepository.sumCompletedWithdrawals();
  }

  async sumCollectedFees(): Promise<number> {
    return this.withdrawalRepository.sumCollectedFees();
  }
}
