export declare class RequestContext {
    private static readonly storage;
    static run<T>(store: Map<string, any>, callback: () => T): T;
    static getStore(): Map<string, any> | undefined;
    static getRequestId(): string | undefined;
    static getUserId(): string | undefined;
    static getCorrelationId(): string | undefined;
    static set(key: string, value: unknown): void;
    static get(key: string): unknown;
}
