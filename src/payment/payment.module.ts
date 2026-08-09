import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  WebhookEvent,
  WebhookEventSchema,
} from './entities/webhook-event.entity';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { StripeProvider } from './providers/stripe.provider';
import { PaymobProvider } from './providers/paymob.provider';
import { RabbitMQModule } from '../infrastructure/rabbitmq/rabbitmq.module';
import { TransactionModule } from '../transaction/transaction.module';
import { OutboxModule } from '../infrastructure/outbox/outbox.module';
import { WalletModule } from '../wallet/wallet.module';
import { WebhookConsumer } from './consumers/webhook.consumer';
import { ReconciliationService } from './reconciliation.service';
import { PaymentExpirationService } from './payment-expiration.service';
import { MongoWebhookEventRepository } from './repositories/mongo.webhook-event.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WebhookEvent.name, schema: WebhookEventSchema },
    ]),
    RabbitMQModule,
    TransactionModule,
    OutboxModule,
    WalletModule,
  ],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    PaymentProviderFactory,
    StripeProvider,
    PaymobProvider,
    WebhookConsumer,
    ReconciliationService,
    PaymentExpirationService,
    {
      provide: 'IWebhookEventRepository',
      useClass: MongoWebhookEventRepository,
    },
  ],
  exports: [PaymentService, PaymentProviderFactory, 'IWebhookEventRepository'],
})
export class PaymentModule {}
