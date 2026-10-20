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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const graphql_1 = require("@nestjs/graphql");
const operators_1 = require("rxjs/operators");
const nest_winston_1 = require("nest-winston");
const winston_1 = require("winston");
const request_context_1 = require("../context/request.context");
let LoggingInterceptor = class LoggingInterceptor {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    intercept(context, next) {
        const now = Date.now();
        const type = context.getType();
        let reqInfo = 'Unknown Request';
        let userId = request_context_1.RequestContext.getUserId() || 'anonymous';
        if (type === 'graphql') {
            const gqlContext = graphql_1.GqlExecutionContext.create(context);
            const info = gqlContext.getInfo();
            const parentType = info?.parentType?.name || 'GraphQL';
            const fieldName = info?.fieldName || 'Operation';
            const ctx = gqlContext.getContext();
            if (ctx?.req?.user?.sub) {
                userId = ctx.req.user.sub;
                request_context_1.RequestContext.set('userId', userId);
            }
            reqInfo = `GraphQL ${parentType}.${fieldName}`;
        }
        else {
            const httpContext = context.switchToHttp();
            const req = httpContext.getRequest();
            if (req) {
                const method = req.method || 'GET';
                const url = req.url || '/';
                if (req.user?.sub) {
                    userId = req.user.sub;
                    request_context_1.RequestContext.set('userId', userId);
                }
                reqInfo = `HTTP ${method} ${url}`;
            }
        }
        return next.handle().pipe((0, operators_1.tap)({
            next: () => {
                const duration = Date.now() - now;
                this.logger.info(`${reqInfo} | Status: SUCCESS | Duration: ${duration}ms`, { context: 'RequestLogger' });
            },
            error: (err) => {
                const duration = Date.now() - now;
                let status = '500';
                if (err && typeof err === 'object') {
                    const errorObj = err;
                    if (typeof errorObj['status'] === 'number' ||
                        typeof errorObj['status'] === 'string') {
                        status = String(errorObj['status']);
                    }
                }
                const message = err?.message || 'Internal Server Error';
                this.logger.error(`${reqInfo} | Status: FAILED (${status}) | Duration: ${duration}ms | Error: ${message}`, { context: 'RequestLogger' });
            },
        }));
    }
};
exports.LoggingInterceptor = LoggingInterceptor;
exports.LoggingInterceptor = LoggingInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_PROVIDER)),
    __metadata("design:paramtypes", [winston_1.Logger])
], LoggingInterceptor);
//# sourceMappingURL=logging.interceptor.js.map