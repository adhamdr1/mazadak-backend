import { ConfigService } from '@nestjs/config';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';

export const PUB_SUB = 'PUB_SUB';

export const pubSubProvider = {
  provide: PUB_SUB,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): RedisPubSub => {
    const redisUrl = configService.getOrThrow<string>('REDIS_URL');

    // Two separate connections are required:
    // - subscriber: enters subscribe-only mode once used for listening
    // - publisher: remains free for publish operations
    const publisher = new Redis(redisUrl);
    const subscriber = new Redis(redisUrl);

    return new RedisPubSub({ publisher, subscriber });
  },
};
