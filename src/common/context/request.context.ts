import { AsyncLocalStorage } from 'async_hooks';

export class RequestContext {
  private static readonly storage = new AsyncLocalStorage<Map<string, any>>();

  static run<T>(store: Map<string, any>, callback: () => T): T {
    return this.storage.run(store, callback);
  }

  static getStore(): Map<string, any> | undefined {
    return this.storage.getStore();
  }

  static getRequestId(): string | undefined {
    return this.getStore()?.get('requestId') as string | undefined;
  }

  static getUserId(): string | undefined {
    return this.getStore()?.get('userId') as string | undefined;
  }

  static getCorrelationId(): string | undefined {
    return this.getStore()?.get('correlationId') as string | undefined;
  }

  static set(key: string, value: unknown): void {
    const store = this.getStore();
    if (store) {
      store.set(key, value);
    }
  }

  static get(key: string): unknown {
    return this.getStore()?.get(key);
  }
}
