import { Global, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  RABBITMQ_CLIENT,
  NOTIFICATIONS_QUEUE,
  DEAD_LETTER_QUEUE,
} from './rabbitmq.constants';
import { RabbitMQService } from './rabbitmq.service';
import { RabbitMQSetupService } from './rabbitmq-setup.service';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: RABBITMQ_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.getOrThrow<string>('RABBITMQ_URL')],
            queue: NOTIFICATIONS_QUEUE,
            queueOptions: {
              durable: true,
              arguments: {
                'x-dead-letter-exchange': '',
                'x-dead-letter-routing-key': DEAD_LETTER_QUEUE,
              },
            },
            // This client is used only for publishing (fire-and-forget).
            // The reply queue created internally by NestJS for RPC does not support
            // manual ACK, so noAck must be true here.
            noAck: true,
          },
        }),
      },
    ]),
  ],
  providers: [RabbitMQService, RabbitMQSetupService],
  exports: [RabbitMQService],
})
export class RabbitMQModule {}
