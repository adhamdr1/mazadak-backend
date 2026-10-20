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
var ReconciliationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReconciliationService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = __importDefault(require("ioredis"));
const crypto_1 = require("crypto");
const redis_constants_1 = require("../infrastructure/redis/redis.constants");
const payment_provider_factory_1 = require("./providers/payment-provider.factory");
const transaction_status_enum_1 = require("../transaction/enums/transaction-status.enum");
const transaction_type_enum_1 = require("../transaction/enums/transaction-type.enum");
const transaction_service_1 = require("../transaction/transaction.service");
const payment_status_enum_1 = require("./enums/payment-status.enum");
const RECONCILIATION_LOCK_KEY = 'reconciliation:lock';
const LOCK_TTL_SECONDS = 600;
let ReconciliationService = ReconciliationService_1 = class ReconciliationService {
    transactionRepository;
    connection;
    providerFactory;
    transactionService;
    redis;
    logger = new common_1.Logger(ReconciliationService_1.name);
    constructor(transactionRepository, connection, providerFactory, transactionService, redis) {
        this.transactionRepository = transactionRepository;
        this.connection = connection;
        this.providerFactory = providerFactory;
        this.transactionService = transactionService;
        this.redis = redis;
    }
    async reconcilePendingPayments() {
        let acquiredLock = false;
        const lockValue = (0, crypto_1.randomUUID)();
        try {
            const lockResult = await this.redis
                .set(RECONCILIATION_LOCK_KEY, lockValue, 'EX', LOCK_TTL_SECONDS, 'NX')
                .catch((err) => {
                this.logger.warn(`Redis Reconciliation lock error: ${err instanceof Error ? err.message : String(err)}`);
                return null;
            });
            if (!lockResult)
                return;
            acquiredLock = true;
            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
            let page = 1;
            const limit = 100;
            let hasMore = true;
            const processedIds = new Set();
            while (hasMore) {
                const pendingTransactions = await this.transactionRepository.findAll(page, limit, {
                    status: transaction_status_enum_1.TransactionStatus.PENDING,
                    type: transaction_type_enum_1.TransactionType.DEPOSIT,
                    endDate: fifteenMinutesAgo,
                    hasChild: false,
                });
                if (pendingTransactions.length === 0) {
                    break;
                }
                this.logger.log(`Reconciliation page ${page}: Processing ${pendingTransactions.length} pending deposit(s)`);
                for (const transaction of pendingTransactions) {
                    const txId = transaction._id.toString();
                    if (processedIds.has(txId)) {
                        continue;
                    }
                    processedIds.add(txId);
                    if (!transaction.gatewayPaymentIntentId ||
                        !transaction.gatewayProvider) {
                        continue;
                    }
                    try {
                        const providerType = transaction.gatewayProvider;
                        const provider = this.providerFactory.getProvider(providerType);
                        const result = await provider.getPaymentStatus(transaction.gatewayPaymentIntentId);
                        if (result.status !== payment_status_enum_1.PaymentStatus.SUCCESS &&
                            result.status !== payment_status_enum_1.PaymentStatus.FAILED) {
                            continue;
                        }
                        const session = await this.connection.startSession();
                        try {
                            session.startTransaction();
                            if (result.status === payment_status_enum_1.PaymentStatus.SUCCESS) {
                                this.logger.log(`Reconciliation: Transaction ${txId} was SUCCESSFUL on gateway. Crediting wallet.`);
                                await this.transactionService.updateTransactionStatusDirect(txId, transaction_status_enum_1.TransactionStatus.SUCCESS, session);
                            }
                            else if (result.status === payment_status_enum_1.PaymentStatus.FAILED) {
                                this.logger.log(`Reconciliation: Transaction ${txId} was FAILED/CANCELED on gateway.`);
                                await this.transactionService.updateTransactionStatusDirect(txId, transaction_status_enum_1.TransactionStatus.FAILED, session);
                            }
                            await session.commitTransaction();
                        }
                        catch (err) {
                            await session.abortTransaction();
                            this.logger.error(`Failed to reconcile transaction ${txId}: ${err instanceof Error ? err.message : String(err)}`);
                        }
                        finally {
                            await session.endSession();
                        }
                    }
                    catch (err) {
                        this.logger.error(`Failed to get payment status for transaction ${txId}: ${err instanceof Error ? err.message : String(err)}`);
                    }
                }
                if (pendingTransactions.length < limit) {
                    hasMore = false;
                }
                else {
                    page++;
                }
            }
        }
        catch (err) {
            this.logger.error(`Reconciliation job error: ${err instanceof Error ? err.message : String(err)}`);
        }
        finally {
            if (acquiredLock) {
                await this.redis
                    .eval(redis_constants_1.RELEASE_LOCK_LUA_SCRIPT, 1, RECONCILIATION_LOCK_KEY, lockValue)
                    .catch(() => undefined);
            }
        }
    }
};
exports.ReconciliationService = ReconciliationService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_10_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReconciliationService.prototype, "reconcilePendingPayments", null);
exports.ReconciliationService = ReconciliationService = ReconciliationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('ITransactionRepository')),
    __param(1, (0, mongoose_1.InjectConnection)()),
    __param(4, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [Object, mongoose_2.Connection,
        payment_provider_factory_1.PaymentProviderFactory,
        transaction_service_1.TransactionService,
        ioredis_2.default])
], ReconciliationService);
//# sourceMappingURL=reconciliation.service.js.map