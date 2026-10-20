"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pubSubProvider = exports.dateReviver = exports.PUB_SUB = void 0;
const config_1 = require("@nestjs/config");
const graphql_redis_subscriptions_1 = require("graphql-redis-subscriptions");
const ioredis_1 = __importDefault(require("ioredis"));
exports.PUB_SUB = 'PUB_SUB';
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const dateReviver = (_key, value) => {
    if (typeof value === 'string' && ISO_DATE_REGEX.test(value)) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            return date;
        }
    }
    return value;
};
exports.dateReviver = dateReviver;
exports.pubSubProvider = {
    provide: exports.PUB_SUB,
    inject: [config_1.ConfigService],
    useFactory: (configService) => {
        const redisUrl = configService.getOrThrow('REDIS_URL');
        const publisher = new ioredis_1.default(redisUrl);
        const subscriber = new ioredis_1.default(redisUrl);
        return new graphql_redis_subscriptions_1.RedisPubSub({
            publisher,
            subscriber,
            reviver: exports.dateReviver,
        });
    },
};
//# sourceMappingURL=pubsub.provider.js.map