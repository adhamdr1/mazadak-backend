import { Inject, Injectable } from '@nestjs/common';
import { ClientSession, Types } from 'mongoose';
import { TransactionStatus } from './enums/transaction-status.enum';
import { TransactionType } from './enums/transaction-type.enum';
import { RabbitMQEvent } from '../infrastructure/rabbitmq/rabbitmq-event.types';
import { OutboxService } from '../infrastructure/outbox/outbox.service';
import {
  type ITransactionRepository,
  type CreateTransactionData,
} from './interfaces/transaction.repository.interface';
import { Transaction } from './entities/transaction.entity';
import { TransactionsPage } from './dto/transactions-page.type';
import { TransactionsFilterInput } from './dto/transactions-filter.input';
import { PaginationInput } from '../common/dto/pagination.input';
import { TransactionNotFoundException } from '../payment/exceptions/transaction-not-found.exception';
import { TransactionAmountMismatchException } from '../payment/exceptions/transaction-amount-mismatch.exception';
import { TransactionCurrencyMismatchException } from '../payment/exceptions/transaction-currency-mismatch.exception';
import Decimal from 'decimal.js';

@Injectable()
export class TransactionService {
  constructor(
    @Inject('ITransactionRepository')
    private readonly transactionRepository: ITransactionRepository,
    private readonly outboxService: OutboxService,
  ) {}

  async createTransaction(
    data: CreateTransactionData,
    session?: ClientSession,
  ): Promise<Transaction> {
    const transaction = await this.transactionRepository.create(data, session);

    if (data.referenceId && Types.ObjectId.isValid(data.referenceId)) {
      await this.transactionRepository.markHasChild(data.referenceId, session);
    }

    return transaction;
  }

  async updateGatewayPaymentIntentId(
    id: string,
    gatewayPaymentIntentId: string,
    session?: ClientSession,
  ): Promise<Transaction | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.transactionRepository.updateGatewayPaymentIntentId(
      id,
      gatewayPaymentIntentId,
      session,
    );
  }

  // ─── Payment Webhook Processing ──────────────────────────────────────────────

  async updateTransactionStatusDirect(
    transactionId: string,
    status: TransactionStatus,
    session: ClientSession,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(transactionId)) {
      throw new TransactionNotFoundException();
    }
    // 1. Fetch transaction within session
    const transaction = await this.transactionRepository.findById(
      transactionId,
      session,
    );
    if (!transaction) {
      throw new TransactionNotFoundException();
    }

    // 2. Prevent re-processing
    if (transaction.hasChild) {
      return; // Already processed
    }

    // 3. Create status transition by appending a new transaction record
    try {
      await this.createTransaction(
        {
          walletId: transaction.walletId.toString(),
          type: transaction.type,
          amount: Number(transaction.amount.toString()),
          currency: transaction.currency,
          status,
          referenceId: transaction._id.toString(), // reference the original PENDING transaction
          idempotencyKey: transaction.idempotencyKey ?? undefined,
          gatewayPaymentIntentId:
            transaction.gatewayPaymentIntentId ?? undefined,
          gatewayTransactionId: transaction.gatewayTransactionId ?? undefined,
          gatewayProvider: transaction.gatewayProvider ?? undefined,
          referenceType: transaction.referenceType ?? undefined,
          expiresAt: transaction.expiresAt ?? undefined,
        },
        session,
      );
    } catch (err) {
      const errorWithCode = err as { code?: number };
      if (errorWithCode && errorWithCode.code === 11000) {
        return; // Already processed by another concurrent request (Duplicate Key)
      }
      throw err;
    }

    // 4. If success and it's a deposit, drop outbox event
    if (
      status === TransactionStatus.SUCCESS &&
      transaction.type === TransactionType.DEPOSIT
    ) {
      await this.outboxService.saveEvent(
        RabbitMQEvent.WalletDepositInitiated,
        {
          walletId: transaction.walletId.toString(),
          amount: Number(transaction.amount.toString()),
          transactionId: transaction._id.toString(),
        },
        session,
        transactionId, // correlationId
      );
    }
  }

  async updateTransactionStatusAndEmitOutbox(
    transactionId: string,
    status: TransactionStatus,
    webhookAmount: number, // in minor units
    webhookCurrency: string,
    session: ClientSession,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(transactionId)) {
      throw new TransactionNotFoundException();
    }
    const transaction = await this.transactionRepository.findById(
      transactionId,
      session,
    );
    if (!transaction) {
      throw new TransactionNotFoundException();
    }

    if (transaction.hasChild) {
      return;
    }

    // Validate amount and currency (converting webhook minor units to major units)
    const expectedAmount = new Decimal(webhookAmount).div(100).toNumber();
    if (!new Decimal(transaction.amount.toString()).equals(expectedAmount)) {
      throw new TransactionAmountMismatchException(
        Number(transaction.amount.toString()),
        expectedAmount,
      );
    }

    if (transaction.currency.toUpperCase() !== webhookCurrency.toUpperCase()) {
      throw new TransactionCurrencyMismatchException(
        transaction.currency,
        webhookCurrency,
      );
    }

    await this.updateTransactionStatusDirect(transactionId, status, session);
  }

  // ─── Resolver ────────────────────────────────────────────────────────────────

  async getTransactionsByWalletId(
    walletId: string,
    input: PaginationInput,
    filter?: TransactionsFilterInput,
  ): Promise<TransactionsPage> {
    const { page, limit } = input;

    const [items, total] = await Promise.all([
      this.transactionRepository.findByWalletId(walletId, page, limit, filter),
      this.transactionRepository.countByWalletId(walletId, filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      totalPages,
      hasNextPage: page < totalPages,
    };
  }

  async getAllTransactions(
    input: PaginationInput,
    filter?: TransactionsFilterInput,
  ): Promise<TransactionsPage> {
    const { page, limit } = input;
    const [items, total] = await Promise.all([
      this.transactionRepository.findAll(page, limit, filter),
      this.transactionRepository.countAll(filter),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      items,
      total,
      totalPages,
      hasNextPage: page < totalPages,
    };
  }

  async countTransactions(filter?: TransactionsFilterInput): Promise<number> {
    return this.transactionRepository.countAll(filter);
  }

  async sumTodayRevenue(): Promise<number> {
    return this.transactionRepository.sumTodayRevenue();
  }
}
