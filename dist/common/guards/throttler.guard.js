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
var CustomThrottlerGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomThrottlerGuard = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const graphql_1 = require("@nestjs/graphql");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = __importDefault(require("ioredis"));
const config_1 = require("@nestjs/config");
const ip_blacklist_middleware_1 = require("../middleware/ip-blacklist.middleware");
const core_1 = require("@nestjs/core");
let CustomThrottlerGuard = CustomThrottlerGuard_1 = class CustomThrottlerGuard extends throttler_1.ThrottlerGuard {
    redis;
    configService;
    logger = new common_1.Logger(CustomThrottlerGuard_1.name);
    constructor(options, storageService, reflector, redis, configService) {
        super(options, storageService, reflector);
        this.redis = redis;
        this.configService = configService;
    }
    async canActivate(context) {
        if (context.getType() === 'graphql') {
            const ctx = graphql_1.GqlExecutionContext.create(context);
            const gqlCtx = ctx.getContext();
            if (gqlCtx.extra || !gqlCtx.res) {
                return true;
            }
        }
        return super.canActivate(context);
    }
    getRequestResponse(context) {
        if (context.getType() === 'graphql') {
            const ctx = graphql_1.GqlExecutionContext.create(context);
            const gqlCtx = ctx.getContext();
            return { req: gqlCtx.req, res: gqlCtx.res };
        }
        const http = context.switchToHttp();
        return {
            req: http.getRequest(),
            res: http.getResponse(),
        };
    }
    async getTracker(req) {
        const request = req;
        if (request.user?.sub) {
            return request.user.sub;
        }
        return super.getTracker(req);
    }
    async handleRequest(requestProps) {
        try {
            return await super.handleRequest(requestProps);
        }
        catch (e) {
            if (e instanceof throttler_1.ThrottlerException &&
                requestProps.throttler.name === 'strict') {
                const { req } = this.getRequestResponse(requestProps.context);
                const ip = req.ip ?? req.socket?.remoteAddress;
                if (!ip) {
                    throw new throttler_1.ThrottlerException('Rate limit exceeded. Please try again later.');
                }
                const ttlSeconds = this.configService.get('STRICT_RATE_LIMIT_BLOCK_TTL', 86400);
                if (ttlSeconds > 0) {
                    try {
                        await this.redis.set(`${ip_blacklist_middleware_1.IP_BLACKLIST_PREFIX}${ip}`, 'blocked', 'EX', ttlSeconds);
                    }
                    catch (error) {
                        this.logger.error(`Failed to add IP ${ip} to blacklist`, error);
                    }
                }
                throw new throttler_1.ThrottlerException('Rate limit exceeded. Your IP has been temporarily blocked due to suspicious activity.');
            }
            if (e instanceof throttler_1.ThrottlerException) {
                throw new throttler_1.ThrottlerException('Rate limit exceeded. Please try again later.');
            }
            throw e;
        }
    }
};
exports.CustomThrottlerGuard = CustomThrottlerGuard;
exports.CustomThrottlerGuard = CustomThrottlerGuard = CustomThrottlerGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, throttler_1.InjectThrottlerOptions)()),
    __param(1, (0, throttler_1.InjectThrottlerStorage)()),
    __param(3, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [Object, Object, core_1.Reflector,
        ioredis_2.default,
        config_1.ConfigService])
], CustomThrottlerGuard);
//# sourceMappingURL=throttler.guard.js.map