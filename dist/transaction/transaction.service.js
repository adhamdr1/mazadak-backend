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
exports.TransactionService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("mongoose");
const transaction_status_enum_1 = require("./enums/transaction-status.enum");
const transaction_type_enum_1 = require("./enums/transaction-type.enum");
const transaction_reference_type_enum_1 = require("./enums/transaction-reference-type.enum");
const rabbitmq_event_types_1 = require("../infrastructure/rabbitmq/rabbitmq-event.types");
const outbox_service_1 = require("../infrastructure/outbox/outbox.service");
const transaction_not_found_exception_1 = require("../payment/exceptions/transaction-not-found.exception");
const transaction_amount_mismatch_exception_1 = require("../payment/exceptions/transaction-amount-mismatch.exception");
const transaction_currency_mismatch_exception_1 = require("../payment/exceptions/transaction-currency-mismatch.exception");
const decimal_js_1 = __importDefault(require("decimal.js"));
let TransactionService = class TransactionService {
    transactionRepository;
    outboxService;
    constructor(transactionRepository, outboxService) {
        this.transactionRepository = transactionRepository;
        this.outboxService = outboxService;
    }
    async createTransaction(data, session) {
        const transaction = await this.transactionRepository.create(data, session);
        if (data.referenceId && mongoose_1.Types.ObjectId.isValid(data.referenceId)) {
            await this.transactionRepository.markHasChild(data.referenceId, session);
        }
        return transaction;
    }
    async updateGatewayPaymentIntentId(id, gatewayPaymentIntentId, session) {
        if (!mongoose_1.Types.ObjectId.isValid(id))
            return null;
        return this.transactionRepository.updateGatewayPaymentIntentId(id, gatewayPaymentIntentId, session);
    }
    async findByIdWithinSession(id, session) {
        if (!mongoose_1.Types.ObjectId.isValid(id))
            return null;
        return this.transactionRepository.findById(id, session);
    }
    async markWalletCredited(id, session) {
        if (!mongoose_1.Types.ObjectId.isValid(id))
            return null;
        return this.transactionRepository.markWalletCredited(id, session);
    }
    async updateTransactionStatusDirect(transactionId, status, session) {
        if (!mongoose_1.Types.ObjectId.isValid(transactionId)) {
            throw new transaction_not_found_exception_1.TransactionNotFoundException();
        }
        const transaction = await this.transactionRepository.findById(transactionId, session);
        if (!transaction) {
            throw new transaction_not_found_exception_1.TransactionNotFoundException();
        }
        if (transaction.hasChild) {
            return;
        }
        try {
            await this.createTransaction({
                walletId: transaction.walletId.toString(),
                type: transaction.type,
                amount: Number(transaction.amount.toString()),
                currency: transaction.currency,
                status,
                referenceId: transaction._id.toString(),
                idempotencyKey: transaction.idempotencyKey ?? undefined,
                gatewayPaymentIntentId: transaction.gatewayPaymentIntentId ?? undefined,
                gatewayTransactionId: transaction.gatewayTransactionId ?? undefined,
                gatewayProvider: transaction.gatewayProvider ?? undefined,
                referenceType: transaction.referenceType ?? transaction_reference_type_enum_1.TransactionReferenceType.TRANSACTION,
                expiresAt: transaction.expiresAt ?? undefined,
            }, session);
        }
        catch (err) {
            const errorWithCode = err;
            if (errorWithCode && errorWithCode.code === 11000) {
                return;
            }
            throw err;
        }
        if (status === transaction_status_enum_1.TransactionStatus.SUCCESS &&
            transaction.type === transaction_type_enum_1.TransactionType.DEPOSIT) {
            await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.WalletDepositInitiated, {
                walletId: transaction.walletId.toString(),
                amount: Number(transaction.amount.toString()),
                transactionId: transaction._id.toString(),
            }, session, transactionId);
        }
    }
    async updateTransactionStatusAndEmitOutbox(transactionId, status, webhookAmount, webhookCurrency, session) {
        if (!mongoose_1.Types.ObjectId.isValid(transactionId)) {
            throw new transaction_not_found_exception_1.TransactionNotFoundException();
        }
        const transaction = await this.transactionRepository.findById(transactionId, session);
        if (!transaction) {
            throw new transaction_not_found_exception_1.TransactionNotFoundException();
        }
        if (transaction.hasChild) {
            return;
        }
        const expectedAmount = new decimal_js_1.default(webhookAmount).div(100).toNumber();
        if (!new decimal_js_1.default(transaction.amount.toString()).equals(expectedAmount)) {
            throw new transaction_amount_mismatch_exception_1.TransactionAmountMismatchException(Number(transaction.amount.toString()), expectedAmount);
        }
        if (transaction.currency.toUpperCase() !== webhookCurrency.toUpperCase()) {
            throw new transaction_currency_mismatch_exception_1.TransactionCurrencyMismatchException(transaction.currency, webhookCurrency);
        }
        await this.updateTransactionStatusDirect(transactionId, status, session);
    }
    async getTransactionsByWalletId(walletId, input, filter) {
        const { page, limit } = input;
        const [items, total] = await Promise.all([
            this.transactionRepository.findByWalletId(walletId, page, limit, filter),
            this.transactionRepository.countByWalletId(walletId, filter),
        ]);
        const totalPages = Math.ceil(total / limit);
        return {
            items,
            total,
            totalPages,
            hasNextPage: page < totalPages,
        };
    }
    async getAllTransactions(input, filter) {
        const { page, limit } = input;
        const [items, total] = await Promise.all([
            this.transactionRepository.findAll(page, limit, filter),
            this.transactionRepository.countAll(filter),
        ]);
        const totalPages = Math.ceil(total / limit);
        return {
            items,
            total,
            totalPages,
            hasNextPage: page < totalPages,
        };
    }
    async countTransactions(filter) {
        return this.transactionRepository.countAll(filter);
    }
    async sumTodayRevenue() {
        return this.transactionRepository.sumTodayRevenue();
    }
};
exports.TransactionService = TransactionService;
exports.TransactionService = TransactionService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('ITransactionRepository')),
    __metadata("design:paramtypes", [Object, outbox_service_1.OutboxService])
], TransactionService);
//# sourceMappingURL=transaction.service.js.map