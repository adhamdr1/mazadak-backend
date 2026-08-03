import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import Decimal from 'decimal.js';
import type { ITransactionRepository } from '../transaction/interfaces/transaction.repository.interface';
import { TransactionService } from '../transaction/transaction.service';
import { TransactionStatus } from '../transaction/enums/transaction-status.enum';
import { TransactionType } from '../transaction/enums/transaction-type.enum';

const EXPIRATION_LOCK_KEY = 'payment:expiration:lock';
const LOCK_TTL_SECONDS = 30;

@Injectable()
export class PaymentExpirationService {
  private readonly logger = new Logger(PaymentExpirationService.name);

  constructor(
    @Inject('ITransactionRepository')
    private readonly transactionRepository: ITransactionRepository,
    private readonly transactionService: TransactionService,
    @InjectConnection() private readonly connection: Connection,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * Periodically check for PENDING deposit transactions that have passed their expiresAt timestamp
   * and update their status to EXPIRED.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredPayments(): Promise<void> {
    let acquiredLock = false;

    try {
      const lockResult = await this.redis
        .set(EXPIRATION_LOCK_KEY, '1', 'EX', LOCK_TTL_SECONDS, 'NX')
        .catch((err) => {
          this.logger.warn(
            `Redis ExpirationWorker lock error: ${err instanceof Error ? err.message : String(err)}`,
          );
          return null;
        });

      if (!lockResult) return;
      acquiredLock = true;

      const now = new Date();
      let page = 1;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        // Find PENDING deposit transactions where expiresAt <= now
        const pendingTransactions = await this.transactionRepository.findAll(
          page,
          limit,
          {
            status: TransactionStatus.PENDING,
            type: TransactionType.DEPOSIT,
            endDate: now,
          },
        );

        if (pendingTransactions.length === 0) {
          break;
        }

        // Filter only transactions with explicit expiresAt passed
        const trulyExpired = pendingTransactions.filter(
          (t) => t.expiresAt && new Date(t.expiresAt) <= now,
        );

        if (trulyExpired.length > 0) {
          this.logger.log(
            `Expiration worker page ${page}: Found ${trulyExpired.length} expired pending deposit(s). Marking as EXPIRED...`,
          );

          for (const transaction of trulyExpired) {
            const session = await this.connection.startSession();
            try {
              session.startTransaction();

              await this.transactionService.updateTransactionStatusAndEmitOutbox(
                transaction._id.toString(),
                TransactionStatus.EXPIRED,
                new Decimal(transaction.amount).mul(100).toNumber(),
                transaction.currency,
                session,
              );

              await session.commitTransaction();
              this.logger.log(
                `Transaction ${transaction._id.toString()} successfully marked as EXPIRED.`,
              );
            } catch (err) {
              await session.abortTransaction();
              this.logger.error(
                `Failed to expire transaction ${transaction._id.toString()}: ${err instanceof Error ? err.message : String(err)}`,
              );
            } finally {
              await session.endSession();
            }
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
        `PaymentExpirationWorker error: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      if (acquiredLock) {
        await this.redis.del(EXPIRATION_LOCK_KEY).catch(() => undefined);
      }
    }
  }
}
