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
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = __importDefault(require("ioredis"));
const users_service_1 = require("../../users/users.service");
const account_banned_exception_1 = require("../exceptions/account-banned.exception");
const account_soft_deleted_exception_1 = require("../exceptions/account-soft-deleted.exception");
const user_not_found_exception_1 = require("../../users/exceptions/user-not-found.exception");
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    usersService;
    redis;
    constructor(configService, usersService, redis) {
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.getOrThrow('JWT_SECRET'),
        });
        this.usersService = usersService;
        this.redis = redis;
    }
    async validate(payload) {
        const cacheKey = `user:auth-status:${payload.sub}`;
        const results = await this.redis
            .pipeline()
            .get(cacheKey)
            .ttl(cacheKey)
            .exec();
        const cachedStatus = results?.[0]?.[1];
        const ttl = results?.[1]?.[1] ?? 0;
        if (cachedStatus) {
            if (ttl > 0 && ttl <= 60) {
                this.triggerBackgroundRefresh(payload.sub, cacheKey);
            }
            if (cachedStatus === 'banned') {
                throw new account_banned_exception_1.AccountBannedException();
            }
            if (cachedStatus === 'deleted') {
                throw new account_soft_deleted_exception_1.AccountSoftDeletedException();
            }
            return payload;
        }
        const status = await this.dbCheckAndCache(payload.sub, cacheKey);
        if (status === 'banned') {
            throw new account_banned_exception_1.AccountBannedException();
        }
        if (status === 'deleted') {
            throw new account_soft_deleted_exception_1.AccountSoftDeletedException();
        }
        return payload;
    }
    triggerBackgroundRefresh(userId, cacheKey) {
        const lockKey = `${cacheKey}:refresh-lock`;
        this.redis
            .set(lockKey, 'true', 'EX', 15, 'NX')
            .then((acquired) => {
            if (acquired === 'OK') {
                this.dbCheckAndCache(userId, cacheKey).catch(() => {
                    this.redis.del(lockKey).catch(() => undefined);
                });
            }
        })
            .catch(() => undefined);
    }
    async dbCheckAndCache(userId, cacheKey) {
        let status = 'active';
        let user = null;
        try {
            user = await this.usersService.findByIdIncludingDeleted(userId);
        }
        catch (err) {
            if (err instanceof user_not_found_exception_1.UserNotFoundException) {
                status = 'deleted';
            }
            else {
                throw err;
            }
        }
        if (!user || user.deletedAt) {
            status = 'deleted';
        }
        else if (user.isBanned) {
            status = 'banned';
        }
        await this.redis.set(cacheKey, status, 'EX', 300);
        await this.redis.del(`${cacheKey}:refresh-lock`).catch(() => undefined);
        return status;
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [config_1.ConfigService,
        users_service_1.UsersService,
        ioredis_2.default])
], JwtStrategy);
//# sourceMappingURL=jwt.strategy.js.map