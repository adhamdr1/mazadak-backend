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
var PaymentExpirationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentExpirationService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const schedule_1 = require("@nestjs/schedule");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = __importDefault(require("ioredis"));
const crypto_1 = require("crypto");
const redis_constants_1 = require("../infrastructure/redis/redis.constants");
const transaction_service_1 = require("../transaction/transaction.service");
const transaction_status_enum_1 = require("../transaction/enums/transaction-status.enum");
const transaction_type_enum_1 = require("../transaction/enums/transaction-type.enum");
const EXPIRATION_LOCK_KEY = 'payment:expiration:lock';
const LOCK_TTL_SECONDS = 300;
let PaymentExpirationService = PaymentExpirationService_1 = class PaymentExpirationService {
    transactionRepository;
    transactionService;
    connection;
    redis;
    logger = new common_1.Logger(PaymentExpirationService_1.name);
    constructor(transactionRepository, transactionService, connection, redis) {
        this.transactionRepository = transactionRepository;
        this.transactionService = transactionService;
        this.connection = connection;
        this.redis = redis;
    }
    async handleExpiredPayments() {
        let acquiredLock = false;
        const lockValue = (0, crypto_1.randomUUID)();
        try {
            const lockResult = await this.redis
                .set(EXPIRATION_LOCK_KEY, lockValue, 'EX', LOCK_TTL_SECONDS, 'NX')
                .catch((err) => {
                this.logger.warn(`Redis ExpirationWorker lock error: ${err instanceof Error ? err.message : String(err)}`);
                return null;
            });
            if (!lockResult)
                return;
            acquiredLock = true;
            const now = new Date();
            let page = 1;
            const limit = 100;
            let hasMore = true;
            while (hasMore) {
                const expiredTransactions = await this.transactionRepository.findAll(page, limit, {
                    status: transaction_status_enum_1.TransactionStatus.PENDING,
                    type: transaction_type_enum_1.TransactionType.DEPOSIT,
                    expiresAtBefore: now,
                    hasChild: false,
                });
                if (expiredTransactions.length === 0) {
                    break;
                }
                this.logger.log(`Expiration worker page ${page}: Found ${expiredTransactions.length} expired pending deposit(s). Marking as EXPIRED...`);
                for (const transaction of expiredTransactions) {
                    const session = await this.connection.startSession();
                    try {
                        session.startTransaction();
                        await this.transactionService.updateTransactionStatusDirect(transaction._id.toString(), transaction_status_enum_1.TransactionStatus.EXPIRED, session);
                        await session.commitTransaction();
                        this.logger.log(`Transaction ${transaction._id.toString()} successfully marked as EXPIRED.`);
                    }
                    catch (err) {
                        await session.abortTransaction();
                        this.logger.error(`Failed to expire transaction ${transaction._id.toString()}: ${err instanceof Error ? err.message : String(err)}`);
                    }
                    finally {
                        await session.endSession();
                    }
                }
                if (expiredTransactions.length < limit) {
                    hasMore = false;
                }
                else {
                    page++;
                }
            }
        }
        catch (err) {
            this.logger.error(`PaymentExpirationWorker error: ${err instanceof Error ? err.message : String(err)}`);
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
exports.PaymentExpirationService = PaymentExpirationService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_5_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PaymentExpirationService.prototype, "handleExpiredPayments", null);
exports.PaymentExpirationService = PaymentExpirationService = PaymentExpirationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('ITransactionRepository')),
    __param(2, (0, mongoose_1.InjectConnection)()),
    __param(3, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [Object, transaction_service_1.TransactionService,
        mongoose_2.Connection,
        ioredis_2.default])
], PaymentExpirationService);
//# sourceMappingURL=payment-expiration.service.js.map