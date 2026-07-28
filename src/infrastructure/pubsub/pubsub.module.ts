import { Global, Module } from '@nestjs/common';
import { pubSubProvider } from './pubsub.provider';

// @Global() makes PUB_SUB available in every module without explicit import.
// This is appropriate for infrastructure-level singletons like PubSub.
@Global()
@Module({
  providers: [pubSubProvider],
  exports: [pubSubProvider],
})
export class PubSubModule {}
