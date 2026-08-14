import { ConfigService } from '@nestjs/config';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';

export const PUB_SUB = 'PUB_SUB';

const ISO_DATE_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

/**
 * Reviver function for JSON.parse in RedisPubSub.
 * Deserializes ISO date strings back into JavaScript Date instances
 * so GraphQL DateTime scalar serializers do not fail on subscription events.
 */
export const dateReviver = (_key: string, value: unknown): unknown => {
  if (typeof value === 'string' && ISO_DATE_REGEX.test(value)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return value;
};

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

    return new RedisPubSub({
      publisher,
      subscriber,
      reviver: dateReviver,
    });
  },
};
