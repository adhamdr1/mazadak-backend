import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import type { ITransactionRepository } from '../transaction/interfaces/transaction.repository.interface';
import { RELEASE_LOCK_LUA_SCRIPT } from '../infrastructure/redis/redis.constants';
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
    const lockValue = randomUUID();

    try {
      const lockResult = await this.redis
        .set(EXPIRATION_LOCK_KEY, lockValue, 'EX', LOCK_TTL_SECONDS, 'NX')
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
        // Find PENDING deposit transactions where expiresAt <= now and not resolved
        const expiredTransactions = await this.transactionRepository.findAll(
          page,
          limit,
          {
            status: TransactionStatus.PENDING,
            type: TransactionType.DEPOSIT,
            expiresAtBefore: now,
            hasChild: false, // CRITICAL FIX
          },
        );

        if (expiredTransactions.length === 0) {
          break;
        }

        this.logger.log(
          `Expiration worker page ${page}: Found ${expiredTransactions.length} expired pending deposit(s). Marking as EXPIRED...`,
        );

        for (const transaction of expiredTransactions) {
          const session = await this.connection.startSession();
          try {
            session.startTransaction();

            await this.transactionService.updateTransactionStatusDirect(
              transaction._id.toString(),
              TransactionStatus.EXPIRED,
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

        if (expiredTransactions.length < limit) {
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
        await this.redis
          .eval(RELEASE_LOCK_LUA_SCRIPT, 1, EXPIRATION_LOCK_KEY, lockValue)
          .catch(() => undefined);
      }
    }
  }
}
