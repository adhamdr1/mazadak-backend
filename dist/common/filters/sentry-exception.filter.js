"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentryExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const graphql_1 = require("@nestjs/graphql");
const Sentry = __importStar(require("@sentry/nestjs"));
const request_context_1 = require("../context/request.context");
let SentryExceptionFilter = class SentryExceptionFilter extends core_1.BaseExceptionFilter {
    catch(exception, host) {
        const type = host.getType();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
        }
        const isUnhandled = status >= 500;
        if (isUnhandled) {
            const requestId = request_context_1.RequestContext.getRequestId() || 'system';
            const correlationId = request_context_1.RequestContext.getCorrelationId() || 'system';
            const userId = request_context_1.RequestContext.getUserId() || 'anonymous';
            Sentry.withScope((scope) => {
                scope.setTag('requestId', requestId);
                scope.setTag('correlationId', correlationId);
                scope.setUser({ id: userId });
                if (type === 'graphql') {
                    const gqlHost = graphql_1.GqlArgumentsHost.create(host);
                    const ctx = gqlHost.getContext();
                    const info = gqlHost.getInfo();
                    const args = gqlHost.getArgs();
                    const cleanArgs = this.scrubSensitiveData(args);
                    scope.setExtra('graphql_query', info?.fieldName || 'unknown');
                    scope.setExtra('graphql_args', cleanArgs);
                    if (ctx?.req?.headers) {
                        const cleanHeaders = this.scrubSensitiveData(ctx.req.headers);
                        scope.setExtra('headers', cleanHeaders);
                    }
                }
                else {
                    const ctx = host.switchToHttp();
                    const req = ctx.getRequest();
                    if (req) {
                        const cleanHeaders = this.scrubSensitiveData(req.headers || {});
                        const cleanBody = this.scrubSensitiveData(req.body || {});
                        const cleanQuery = this.scrubSensitiveData(req.query || {});
                        scope.setExtra('url', req.url);
                        scope.setExtra('method', req.method);
                        scope.setExtra('headers', cleanHeaders);
                        scope.setExtra('body', cleanBody);
                        scope.setExtra('query', cleanQuery);
                    }
                }
                Sentry.captureException(exception);
            });
        }
        if (type === 'graphql') {
            throw exception;
        }
        super.catch(exception, host);
    }
    scrubSensitiveData(data) {
        if (!data || typeof data !== 'object')
            return data;
        const sensitiveKeys = [
            'password',
            'token',
            'refreshtoken',
            'otp',
            'cardnumber',
            'secret',
            'authorization',
            'cookie',
        ];
        const clean = { ...data };
        for (const key of Object.keys(clean)) {
            const value = clean[key];
            if (sensitiveKeys.includes(key.toLowerCase())) {
                clean[key] = '[REDACTED]';
            }
            else if (value && typeof value === 'object') {
                clean[key] = this.scrubSensitiveData(value);
            }
        }
        return clean;
    }
};
exports.SentryExceptionFilter = SentryExceptionFilter;
exports.SentryExceptionFilter = SentryExceptionFilter = __decorate([
    (0, common_1.Injectable)(),
    (0, common_1.Catch)()
], SentryExceptionFilter);
//# sourceMappingURL=sentry-exception.filter.js.map