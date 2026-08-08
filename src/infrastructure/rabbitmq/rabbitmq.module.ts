import { Global, Module } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';
import { RabbitMQSetupService } from './rabbitmq-setup.service';

@Global()
@Module({
  providers: [RabbitMQService, RabbitMQSetupService],
  exports: [RabbitMQService],
})
export class RabbitMQModule {}
