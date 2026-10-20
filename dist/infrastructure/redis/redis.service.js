"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var RedisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = exports.dateReviver = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = __importDefault(require("ioredis"));
const crypto_1 = require("crypto");
const redis_constants_1 = require("./redis.constants");
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
let RedisService = RedisService_1 = class RedisService {
    redis;
    logger = new common_1.Logger(RedisService_1.name);
    inFlight = new Map();
    constructor(redis) {
        this.redis = redis;
    }
    async getOrSetSWR(key, softTtlMs, hardTtlS, fetcher) {
        try {
            const raw = await this.redis.get(key);
            if (raw !== null) {
                const entry = JSON.parse(raw, exports.dateReviver);
                if (Date.now() < entry.expiresAt) {
                    this.logger.debug(`Cache HIT (fresh): ${key}`);
                    return entry.data;
                }
                this.logger.debug(`Cache HIT (stale): ${key}`);
                void this.revalidateInBackground(key, softTtlMs, hardTtlS, fetcher);
                return entry.data;
            }
        }
        catch (err) {
            this.logger.warn(`Cache READ error for key "${key}" -- falling back to DB: ${err instanceof Error ? err.message : String(err)}`);
        }
        this.logger.debug(`Cache MISS: ${key}`);
        return this.singleFlight(key, async () => {
            const data = await fetcher();
            await this.setInRedis(key, data, softTtlMs, hardTtlS);
            return data;
        });
    }
    async invalidatePattern(pattern) {
        try {
            let cursor = '0';
            do {
                const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
                cursor = nextCursor;
                if (keys.length > 0) {
                    await this.redis.del(...keys);
                    this.logger.debug(`Invalidated ${keys.length} key(s) matching "${pattern}"`);
                }
            } while (cursor !== '0');
        }
        catch (err) {
            this.logger.warn(`Cache INVALIDATE error for pattern "${pattern}": ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    singleFlight(key, fn) {
        const existing = this.inFlight.get(key);
        if (existing) {
            this.logger.debug(`SingleFlight: waiting on in-flight request for "${key}"`);
            return existing;
        }
        const promise = fn().finally(() => {
            this.inFlight.delete(key);
        });
        this.inFlight.set(key, promise);
        return promise;
    }
    async revalidateInBackground(key, softTtlMs, hardTtlS, fetcher) {
        const lockKey = `revalidating:${key}`;
        const lockValue = (0, crypto_1.randomUUID)();
        let acquiredLock = false;
        try {
            const acquired = await this.redis.set(lockKey, lockValue, 'EX', 30, 'NX');
            if (!acquired) {
                this.logger.debug(`Revalidation lock already held for "${key}" -- skipping`);
                return;
            }
            acquiredLock = true;
            const data = await fetcher();
            await this.setInRedis(key, data, softTtlMs, hardTtlS);
            this.logger.debug(`Background revalidation complete for "${key}"`);
        }
        catch (err) {
            this.logger.warn(`Background revalidation error for "${key}": ${err instanceof Error ? err.message : String(err)}`);
        }
        finally {
            if (acquiredLock) {
                await this.redis
                    .eval(redis_constants_1.RELEASE_LOCK_LUA_SCRIPT, 1, lockKey, lockValue)
                    .catch(() => undefined);
            }
        }
    }
    async setInRedis(key, data, softTtlMs, hardTtlS) {
        try {
            const entry = {
                data,
                expiresAt: Date.now() + softTtlMs,
            };
            await this.redis.set(key, JSON.stringify(entry), 'EX', hardTtlS);
        }
        catch (err) {
            this.logger.warn(`Cache WRITE error for key "${key}": ${err instanceof Error ? err.message : String(err)}`);
        }
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [ioredis_2.default])
], RedisService);
//# sourceMappingURL=redis.service.js.map