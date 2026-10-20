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
var ReviewsExpirationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsExpirationService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = __importDefault(require("ioredis"));
const crypto_1 = require("crypto");
const reviews_service_1 = require("./reviews.service");
const redis_constants_1 = require("../infrastructure/redis/redis.constants");
const EXPIRATION_LOCK_KEY = 'reviews:expiration:lock';
const LOCK_TTL_SECONDS = 600;
let ReviewsExpirationService = ReviewsExpirationService_1 = class ReviewsExpirationService {
    reviewsService;
    redis;
    logger = new common_1.Logger(ReviewsExpirationService_1.name);
    constructor(reviewsService, redis) {
        this.reviewsService = reviewsService;
        this.redis = redis;
    }
    async handleExpiredPendingReviews() {
        let acquiredLock = false;
        const lockValue = (0, crypto_1.randomUUID)();
        try {
            const lockResult = await this.redis
                .set(EXPIRATION_LOCK_KEY, lockValue, 'EX', LOCK_TTL_SECONDS, 'NX')
                .catch((err) => {
                this.logger.warn(`Redis ReviewsExpirationWorker lock error: ${err instanceof Error ? err.message : String(err)}`);
                return null;
            });
            if (!lockResult)
                return;
            acquiredLock = true;
            const publishedCount = await this.reviewsService.publishExpiredPendingReviews();
            if (publishedCount > 0) {
                this.logger.log(`Auto-published ${publishedCount} expired pending review(s).`);
            }
        }
        catch (err) {
            this.logger.error(`ReviewsExpirationService error: ${err instanceof Error ? err.message : String(err)}`);
        }
        finally {
            if (acquiredLock) {
                await this.redis
                    .eval(redis_constants_1.RELEASE_LOCK_LUA_SCRIPT, 1, EXPIRATION_LOCK_KEY, lockValue)
                    .catch(() => undefined);
            }
        }
    }
};
exports.ReviewsExpirationService = ReviewsExpirationService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_10_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReviewsExpirationService.prototype, "handleExpiredPendingReviews", null);
exports.ReviewsExpirationService = ReviewsExpirationService = ReviewsExpirationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [reviews_service_1.ReviewsService,
        ioredis_2.default])
], ReviewsExpirationService);
//# sourceMappingURL=reviews-expiration.service.js.map