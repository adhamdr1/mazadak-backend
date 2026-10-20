"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestContext = void 0;
const async_hooks_1 = require("async_hooks");
class RequestContext {
    static storage = new async_hooks_1.AsyncLocalStorage();
    static run(store, callback) {
        return this.storage.run(store, callback);
    }
    static getStore() {
        return this.storage.getStore();
    }
    static getRequestId() {
        return this.getStore()?.get('requestId');
    }
    static getUserId() {
        return this.getStore()?.get('userId');
    }
    static getCorrelationId() {
        return this.getStore()?.get('correlationId');
    }
    static set(key, value) {
        const store = this.getStore();
        if (store) {
            store.set(key, value);
        }
    }
    static get(key) {
        return this.getStore()?.get(key);
    }
}
exports.RequestContext = RequestContext;
//# sourceMappingURL=request.context.js.map