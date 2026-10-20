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
var WalletService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("mongoose");
const mongoose_2 = require("@nestjs/mongoose");
const wallet_not_found_exception_1 = require("./exceptions/wallet-not-found.exception");
const insufficient_funds_exception_1 = require("./exceptions/insufficient-funds.exception");
const invalid_amount_exception_1 = require("./exceptions/invalid-amount.exception");
const transaction_service_1 = require("../transaction/transaction.service");
const transaction_type_enum_1 = require("../transaction/enums/transaction-type.enum");
const transaction_status_enum_1 = require("../transaction/enums/transaction-status.enum");
const rabbitmq_event_types_1 = require("../infrastructure/rabbitmq/rabbitmq-event.types");
const outbox_service_1 = require("../infrastructure/outbox/outbox.service");
const realtime_service_1 = require("../infrastructure/pubsub/realtime.service");
const decimal_js_1 = __importDefault(require("decimal.js"));
let WalletService = WalletService_1 = class WalletService {
    walletRepository;
    transactionService;
    outboxService;
    realtimeService;
    connection;
    logger = new common_1.Logger(WalletService_1.name);
    constructor(walletRepository, transactionService, outboxService, realtimeService, connection) {
        this.walletRepository = walletRepository;
        this.transactionService = transactionService;
        this.outboxService = outboxService;
        this.realtimeService = realtimeService;
        this.connection = connection;
    }
    validateAmount(amount) {
        if (!amount || new decimal_js_1.default(amount).lessThanOrEqualTo(0)) {
            throw new invalid_amount_exception_1.InvalidAmountException();
        }
    }
    async getWalletOrThrow(userId) {
        const wallet = await this.walletRepository.findByUserId(userId);
        if (!wallet)
            throw new wallet_not_found_exception_1.WalletNotFoundException();
        return wallet;
    }
    async executeWalletOp(params) {
        this.validateAmount(params.amount);
        const wallet = await this.getWalletOrThrow(params.userId);
        const walletId = wallet._id.toString();
        const currency = params.currency ?? 'EGP';
        const updated = await params.operation(walletId, params.amount, params.session);
        if (!updated)
            params.onNull();
        const transaction = await this.transactionService.createTransaction({
            walletId,
            type: params.type,
            amount: params.amount,
            currency,
            status: transaction_status_enum_1.TransactionStatus.SUCCESS,
            referenceId: params.referenceId,
            referenceType: params.referenceType,
        }, params.session);
        void this.realtimeService.publishWalletUpdated(updated);
        return { wallet: updated, transaction };
    }
    async createWallet(userId, session) {
        return await this.walletRepository.create(userId, session);
    }
    async getAllWallets(input) {
        const { page, limit } = input;
        const [items, total] = await Promise.all([
            this.walletRepository.findAll(page, limit),
            this.walletRepository.countAll(),
        ]);
        const totalPages = Math.ceil(total / limit);
        return {
            items,
            total,
            totalPages,
            hasNextPage: page < totalPages,
        };
    }
    async getWalletByUserId(userId) {
        return await this.getWalletOrThrow(userId);
    }
    async getWalletsByUserIds(userIds) {
        return await this.walletRepository.findByUserIds(userIds);
    }
    async sumAllBalances() {
        return this.walletRepository.sumAllBalances();
    }
    async sumHeldBalances() {
        return this.walletRepository.sumHeldBalances();
    }
    async getMyWallet(userId) {
        return await this.getWalletOrThrow(userId);
    }
    async deposit(userId, amount, referenceId, session, currency, referenceType, customType) {
        const { wallet, transaction } = await this.executeWalletOp({
            userId,
            amount,
            currency,
            type: customType ?? transaction_type_enum_1.TransactionType.DEPOSIT,
            referenceId,
            referenceType,
            session,
            operation: (walletId, amt, sess) => this.walletRepository.creditBalance(walletId, amt, sess),
            onNull: () => {
                throw new wallet_not_found_exception_1.WalletNotFoundException();
            },
        });
        if (!referenceId) {
            this.notifyDeposit(userId, amount, transaction._id.toString(), session).catch((err) => {
                this.logger.error(`Failed to queue deposit notification: ${err instanceof Error ? err.message : String(err)}`);
            });
        }
        return { wallet, transaction };
    }
    async withdraw(userId, amount, referenceId, session, referenceType, customType) {
        if (session) {
            return this.executeWithdrawal(userId, amount, referenceId, session, referenceType, customType);
        }
        const newSession = await this.connection.startSession();
        let walletId;
        try {
            newSession.startTransaction();
            const wallet = await this.getWalletOrThrow(userId);
            walletId = wallet._id.toString();
            const result = await this.executeWithdrawal(userId, amount, referenceId, newSession, referenceType, customType);
            await newSession.commitTransaction();
            return result;
        }
        catch (error) {
            await newSession.abortTransaction();
            if (walletId) {
                try {
                    await this.transactionService.createTransaction({
                        walletId,
                        type: customType ?? transaction_type_enum_1.TransactionType.WITHDRAW,
                        amount,
                        currency: 'EGP',
                        status: transaction_status_enum_1.TransactionStatus.FAILED,
                        referenceId,
                        referenceType,
                    });
                }
                catch (logErr) {
                    this.logger.error(`Failed to log FAILED withdrawal transaction for user ${userId}: ${logErr instanceof Error ? logErr.message : String(logErr)}`);
                }
            }
            throw error;
        }
        finally {
            await newSession.endSession();
        }
    }
    async executeWithdrawal(userId, amount, referenceId, session, referenceType, customType) {
        const { wallet, transaction } = await this.executeWalletOp({
            userId,
            amount,
            type: customType ?? transaction_type_enum_1.TransactionType.WITHDRAW,
            referenceId,
            referenceType,
            session,
            operation: (walletId, amt, sess) => this.walletRepository.debitBalance(walletId, amt, sess),
            onNull: () => {
                throw new insufficient_funds_exception_1.InsufficientFundsException();
            },
        });
        if (!referenceId) {
            this.notifyWithdrawal(userId, amount, transaction._id.toString(), session).catch((err) => {
                this.logger.error(`Failed to queue withdrawal notification for user ${userId}: ${err instanceof Error ? err.message : String(err)}`);
            });
        }
        return { wallet, transaction };
    }
    async notifyDeposit(userId, amount, transactionId, session) {
        await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.WalletDeposited, {
            userId,
            amount,
            transactionId: transactionId || 'N/A',
        }, session, transactionId);
    }
    async notifyWithdrawal(userId, amount, transactionId, session) {
        await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.WithdrawalCompleted, {
            userId,
            amount,
            transactionId: transactionId || 'N/A',
        }, session, transactionId);
    }
    async hold(userId, amount, referenceId, session, referenceType) {
        return await this.executeWalletOp({
            userId,
            amount,
            type: transaction_type_enum_1.TransactionType.HOLD,
            referenceId,
            referenceType,
            session,
            operation: (walletId, amt, sess) => this.walletRepository.holdBalance(walletId, amt, sess),
            onNull: () => {
                throw new insufficient_funds_exception_1.InsufficientFundsException();
            },
        });
    }
    async release(userId, amount, referenceId, session, referenceType) {
        return await this.executeWalletOp({
            userId,
            amount,
            type: transaction_type_enum_1.TransactionType.RELEASE,
            referenceId,
            referenceType,
            session,
            operation: (walletId, amt, sess) => this.walletRepository.releaseBalance(walletId, amt, sess),
            onNull: () => {
                throw new insufficient_funds_exception_1.InsufficientFundsException();
            },
        });
    }
    async capture(userId, amount, referenceId, session, referenceType) {
        return await this.executeWalletOp({
            userId,
            amount,
            type: transaction_type_enum_1.TransactionType.CAPTURE,
            referenceId,
            referenceType,
            session,
            operation: (walletId, amt, sess) => this.walletRepository.captureHeldBalance(walletId, amt, sess),
            onNull: () => {
                throw new insufficient_funds_exception_1.InsufficientFundsException();
            },
        });
    }
};
exports.WalletService = WalletService;
exports.WalletService = WalletService = WalletService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('IWalletRepository')),
    __param(4, (0, mongoose_2.InjectConnection)()),
    __metadata("design:paramtypes", [Object, transaction_service_1.TransactionService,
        outbox_service_1.OutboxService,
        realtime_service_1.RealtimeService,
        mongoose_1.Connection])
], WalletService);
//# sourceMappingURL=wallet.service.js.map