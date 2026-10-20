import Redis from 'ioredis';
export declare const dateReviver: (_key: string, value: unknown) => unknown;
export declare class RedisService {
    private readonly redis;
    private readonly logger;
    private readonly inFlight;
    constructor(redis: Redis);
    getOrSetSWR<T>(key: string, softTtlMs: number, hardTtlS: number, fetcher: () => Promise<T>): Promise<T>;
    invalidatePattern(pattern: string): Promise<void>;
    private singleFlight;
    private revalidateInBackground;
    private setInRedis;
}
