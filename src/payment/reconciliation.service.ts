import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import type { ITransactionRepository } from '../transaction/interfaces/transaction.repository.interface';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { PaymentProviderType } from './enums/payment-provider-type.enum';
import { TransactionStatus } from '../transaction/enums/transaction-status.enum';
import { TransactionType } from '../transaction/enums/transaction-type.enum';
import { TransactionService } from '../transaction/transaction.service';
import { PaymentStatus } from './enums/payment-status.enum';
import Decimal from 'decimal.js';

const RECONCILIATION_LOCK_KEY = 'reconciliation:lock';
const LOCK_TTL_SECONDS = 60;

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    @Inject('ITransactionRepository')
    private readonly transactionRepository: ITransactionRepository,
    @InjectConnection() private readonly connection: Connection,
    private readonly providerFactory: PaymentProviderFactory,
    private readonly transactionService: TransactionService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * Periodically check for stuck PENDING deposits (older than 15 minutes)
   * and query the gateway status to reconcile them.
   * Uses Redis distributed lock & pagination loop.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async reconcilePendingPayments(): Promise<void> {
    let acquiredLock = false;

    try {
      const lockResult = await this.redis
        .set(RECONCILIATION_LOCK_KEY, '1', 'EX', LOCK_TTL_SECONDS, 'NX')
        .catch((err) => {
          this.logger.warn(
            `Redis Reconciliation lock error: ${err instanceof Error ? err.message : String(err)}`,
          );
          return null;
        });

      if (!lockResult) return;
      acquiredLock = true;

      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      let page = 1;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        // Find PENDING deposits that are older than 15 minutes
        const pendingTransactions = await this.transactionRepository.findAll(
          page,
          limit,
          {
            status: TransactionStatus.PENDING,
            type: TransactionType.DEPOSIT,
            endDate: fifteenMinutesAgo,
          },
        );

        if (pendingTransactions.length === 0) {
          break;
        }

        this.logger.log(
          `Reconciliation page ${page}: Processing ${pendingTransactions.length} pending deposit(s)`,
        );

        for (const transaction of pendingTransactions) {
          if (
            !transaction.gatewayPaymentIntentId ||
            !transaction.gatewayProvider
          ) {
            continue;
          }

          const session = await this.connection.startSession();
          try {
            session.startTransaction();

            const providerType =
              transaction.gatewayProvider as PaymentProviderType;
            const provider = this.providerFactory.getProvider(providerType);

            const result = await provider.getPaymentStatus(
              transaction.gatewayPaymentIntentId,
            );

            if (result.status === PaymentStatus.SUCCESS) {
              this.logger.log(
                `Reconciliation: Transaction ${transaction._id.toString()} was SUCCESSFUL on gateway. Crediting wallet.`,
              );
              await this.transactionService.updateTransactionStatusAndEmitOutbox(
                transaction._id.toString(),
                TransactionStatus.SUCCESS,
                new Decimal(transaction.amount).mul(100).toNumber(),
                transaction.currency,
                session,
              );
            } else if (result.status === PaymentStatus.FAILED) {
              this.logger.log(
                `Reconciliation: Transaction ${transaction._id.toString()} was FAILED/CANCELED on gateway.`,
              );
              await this.transactionService.updateTransactionStatusAndEmitOutbox(
                transaction._id.toString(),
                TransactionStatus.FAILED,
                new Decimal(transaction.amount).mul(100).toNumber(),
                transaction.currency,
                session,
              );
            }

            await session.commitTransaction();
          } catch (err) {
            await session.abortTransaction();
            this.logger.error(
              `Failed to reconcile transaction ${transaction._id.toString()}: ${err instanceof Error ? err.message : String(err)}`,
            );
          } finally {
            await session.endSession();
          }
        }

        if (pendingTransactions.length < limit) {
          hasMore = false;
        } else {
          page++;
        }
      }
    } catch (err) {
      this.logger.error(
        `Reconciliation job error: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      if (acquiredLock) {
        await this.redis.del(RECONCILIATION_LOCK_KEY).catch(() => undefined);
      }
    }
  }
}
