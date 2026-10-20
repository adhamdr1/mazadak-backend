import { ConfigService } from '@nestjs/config';
import { RedisPubSub } from 'graphql-redis-subscriptions';
export declare const PUB_SUB = "PUB_SUB";
export declare const dateReviver: (_key: string, value: unknown) => unknown;
export declare const pubSubProvider: {
    provide: string;
    inject: (typeof ConfigService)[];
    useFactory: (configService: ConfigService) => RedisPubSub;
};
