import { Global, Module } from '@nestjs/common';
import { pubSubProvider } from './pubsub.provider';
import { RealtimeService } from './realtime.service';

// @Global() makes PUB_SUB and RealtimeService available in every module without explicit import.
// This is appropriate for infrastructure-level singletons like PubSub.
@Global()
@Module({
  providers: [pubSubProvider, RealtimeService],
  exports: [pubSubProvider, RealtimeService],
})
export class PubSubModule {}
