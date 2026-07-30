import { Global, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RABBITMQ_CLIENT, NOTIFICATIONS_QUEUE } from './rabbitmq.constants';
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
            },
            // Ensures the client does not auto-ack; consumers control ACK manually
            noAck: false,
          },
        }),
      },
    ]),
  ],
  providers: [RabbitMQService, RabbitMQSetupService],
  exports: [RabbitMQService],
})
export class RabbitMQModule {}
