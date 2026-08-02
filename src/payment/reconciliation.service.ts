import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import type { ITransactionRepository } from '../transaction/interfaces/transaction.repository.interface';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { PaymentProviderType } from './enums/payment-provider-type.enum';
import { TransactionStatus } from '../transaction/enums/transaction-status.enum';
import { TransactionType } from '../transaction/enums/transaction-type.enum';
import { TransactionService } from '../transaction/transaction.service';
import { OutboxService } from '../infrastructure/outbox/outbox.service';
import { PaymentStatus } from './enums/payment-status.enum';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);
  private isRunning = false;

  constructor(
    @Inject('ITransactionRepository')
    private readonly transactionRepository: ITransactionRepository,
    @InjectConnection() private readonly connection: Connection,
    private readonly providerFactory: PaymentProviderFactory,
    private readonly transactionService: TransactionService,
    private readonly outboxService: OutboxService,
  ) {}

  /**
   * Periodically check for stuck PENDING deposits (older than 15 minutes)
   * and query the gateway status to reconcile them.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async reconcilePendingPayments(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

      // Find PENDING deposits that are older than 15 minutes
      const pendingTransactions = await this.transactionRepository.findAll(
        1,
        100,
        {
          status: TransactionStatus.PENDING,
          type: TransactionType.DEPOSIT,
          endDate: fifteenMinutesAgo,
        },
      );

      if (pendingTransactions.length === 0) return;

      this.logger.log(
        `Found ${pendingTransactions.length} pending deposit(s) for reconciliation`,
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
            // Re-fetch expected amount and currency from transaction since we're verifying it
            // Stripe and Paymob represent amounts in cents (minor units), so we multiply transaction amount by 100 to compare in minor units
            await this.transactionService.updateTransactionStatusAndEmitOutbox(
              transaction._id.toString(),
              TransactionStatus.SUCCESS,
              transaction.amount * 100,
              transaction.currency,
              this.outboxService,
              session,
            );
          } else if (result.status === PaymentStatus.FAILED) {
            this.logger.log(
              `Reconciliation: Transaction ${transaction._id.toString()} was FAILED/CANCELED on gateway.`,
            );
            await this.transactionService.updateTransactionStatusAndEmitOutbox(
              transaction._id.toString(),
              TransactionStatus.FAILED,
              transaction.amount * 100,
              transaction.currency,
              this.outboxService,
              session,
            );
          } else {
            // Still pending or check if transaction has expired
            if (
              transaction.expiresAt &&
              new Date() > new Date(transaction.expiresAt)
            ) {
              this.logger.log(
                `Reconciliation: Pending transaction ${transaction._id.toString()} has expired. Marking as EXPIRED.`,
              );
              await this.transactionService.updateTransactionStatusAndEmitOutbox(
                transaction._id.toString(),
                TransactionStatus.EXPIRED,
                transaction.amount * 100,
                transaction.currency,
                this.outboxService,
                session,
              );
            }
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
    } catch (err) {
      this.logger.error(
        `Reconciliation job error: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      this.isRunning = false;
    }
  }
}
