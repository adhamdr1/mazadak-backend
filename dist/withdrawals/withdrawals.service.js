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
var WithdrawalsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawalsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const decimal_js_1 = __importDefault(require("decimal.js"));
const withdrawal_status_enum_1 = require("./enums/withdrawal-status.enum");
const payout_method_enum_1 = require("./enums/payout-method.enum");
const dto_1 = require("../admin/dto");
const wallet_service_1 = require("../wallet/wallet.service");
const outbox_service_1 = require("../infrastructure/outbox/outbox.service");
const realtime_service_1 = require("../infrastructure/pubsub/realtime.service");
const rabbitmq_event_types_1 = require("../infrastructure/rabbitmq/rabbitmq-event.types");
const transaction_reference_type_enum_1 = require("../transaction/enums/transaction-reference-type.enum");
const transaction_type_enum_1 = require("../transaction/enums/transaction-type.enum");
const insufficient_funds_exception_1 = require("../wallet/exceptions/insufficient-funds.exception");
const exceptions_1 = require("./exceptions");
let WithdrawalsService = WithdrawalsService_1 = class WithdrawalsService {
    withdrawalRepository;
    walletService;
    outboxService;
    realtimeService;
    configService;
    connection;
    logger = new common_1.Logger(WithdrawalsService_1.name);
    constructor(withdrawalRepository, walletService, outboxService, realtimeService, configService, connection) {
        this.withdrawalRepository = withdrawalRepository;
        this.walletService = walletService;
        this.outboxService = outboxService;
        this.realtimeService = realtimeService;
        this.configService = configService;
        this.connection = connection;
    }
    getTodayDateInCairo(date = new Date()) {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Africa/Cairo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(date);
    }
    validatePayoutDetails(method, details) {
        if (!details) {
            throw new exceptions_1.InvalidPayoutDetailsException('PAYOUT_DETAILS_REQUIRED');
        }
        if (method === payout_method_enum_1.PayoutMethod.BANK_ACCOUNT) {
            if (!details.bankName?.trim() || !details.accountHolderName?.trim()) {
                throw new exceptions_1.InvalidPayoutDetailsException('BANK_NAME_AND_HOLDER_NAME_REQUIRED');
            }
            if (!details.accountNumber?.trim() && !details.iban?.trim()) {
                throw new exceptions_1.InvalidPayoutDetailsException('ACCOUNT_NUMBER_OR_IBAN_REQUIRED');
            }
        }
        else if (method === payout_method_enum_1.PayoutMethod.INSTAPAY) {
            if (!details.phoneNumber?.trim() && !details.ipaAddress?.trim()) {
                throw new exceptions_1.InvalidPayoutDetailsException('PHONE_NUMBER_OR_IPA_REQUIRED');
            }
        }
        else {
            if (!details.phoneNumber?.trim()) {
                throw new exceptions_1.InvalidPayoutDetailsException('PHONE_NUMBER_REQUIRED');
            }
        }
    }
    calculateFee(amount, payoutMethod) {
        const feePercentage = this.configService.get('WITHDRAWAL_FEE_PERCENTAGE', 2);
        const amountDec = new decimal_js_1.default(amount || 0);
        const feeDec = amountDec.times(feePercentage).dividedBy(100);
        const netAmountDec = amountDec.minus(feeDec);
        const maxAllowed = payoutMethod === payout_method_enum_1.PayoutMethod.BANK_ACCOUNT ? 10_000_000 : 50_000;
        const estimatedDelivery = payoutMethod === payout_method_enum_1.PayoutMethod.BANK_ACCOUNT
            ? '3-5 business days'
            : 'Within 24 business hours';
        return {
            requestedAmount: amountDec.toFixed(2),
            fee: feeDec.toFixed(2),
            feePercentage,
            netAmount: netAmountDec.toFixed(2),
            maxAllowed,
            estimatedDelivery,
        };
    }
    async requestWithdrawal(userId, input) {
        this.validatePayoutDetails(input.payoutMethod, input.payoutDetails);
        if (input.amount < 50) {
            throw new exceptions_1.WithdrawalBelowMinimumException();
        }
        const maxAllowed = input.payoutMethod === payout_method_enum_1.PayoutMethod.BANK_ACCOUNT ? 10_000_000 : 50_000;
        if (input.amount > maxAllowed) {
            throw new exceptions_1.PayoutMethodAmountExceededException(`WITHDRAWAL_EXCEEDS_MAX_FOR_${input.payoutMethod}`);
        }
        const wallet = await this.walletService.getMyWallet(userId);
        const balance = new decimal_js_1.default(wallet.balance ? wallet.balance.toString() : '0');
        const held = new decimal_js_1.default(wallet.heldBalance ? wallet.heldBalance.toString() : '0');
        const available = balance.minus(held);
        if (available.lessThan(input.amount)) {
            throw new insufficient_funds_exception_1.InsufficientFundsException();
        }
        const hasToday = await this.withdrawalRepository.hasRequestToday(userId);
        if (hasToday) {
            throw new exceptions_1.DailyWithdrawalLimitReachedException();
        }
        const feePercentage = this.configService.get('WITHDRAWAL_FEE_PERCENTAGE', 2);
        const fee = new decimal_js_1.default(input.amount)
            .times(feePercentage)
            .dividedBy(100)
            .toNumber();
        const netAmount = new decimal_js_1.default(input.amount).minus(fee).toNumber();
        const session = await this.connection.startSession();
        session.startTransaction();
        try {
            const { transaction: holdTx } = await this.walletService.hold(userId, input.amount, undefined, session, transaction_reference_type_enum_1.TransactionReferenceType.WITHDRAWAL);
            const requestDate = this.getTodayDateInCairo();
            const withdrawalRequest = await this.withdrawalRepository.create({
                userId,
                amount: input.amount,
                fee,
                feePercentage,
                netAmount,
                currency: 'EGP',
                payoutMethod: input.payoutMethod,
                payoutDetails: input.payoutDetails,
                status: withdrawal_status_enum_1.WithdrawalStatus.PENDING,
                holdTransactionId: new mongoose_2.Types.ObjectId(holdTx._id.toString()),
                requestDate,
            }, session);
            await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.WithdrawalRequested, {
                userId,
                amount: input.amount,
                netAmount,
                fee,
                payoutMethod: input.payoutMethod,
                estimatedDelivery: input.payoutMethod === payout_method_enum_1.PayoutMethod.BANK_ACCOUNT
                    ? '3-5 business days'
                    : 'Within 24 business hours',
                withdrawalId: withdrawalRequest._id.toString(),
            }, session, withdrawalRequest._id.toString());
            await session.commitTransaction();
            void this.realtimeService.publishWithdrawalRequested(withdrawalRequest);
            return withdrawalRequest;
        }
        catch (error) {
            await session.abortTransaction();
            const err = error;
            if (err?.code === 11000) {
                throw new exceptions_1.DailyWithdrawalLimitReachedException();
            }
            throw error;
        }
        finally {
            await session.endSession();
        }
    }
    async cancelWithdrawal(userId, requestId) {
        const session = await this.connection.startSession();
        session.startTransaction();
        try {
            const updated = await this.withdrawalRepository.transitionStatus(requestId, [withdrawal_status_enum_1.WithdrawalStatus.PENDING], withdrawal_status_enum_1.WithdrawalStatus.CANCELLED, {}, session, { userId });
            if (!updated) {
                const existing = await this.withdrawalRepository.findById(requestId, session);
                if (!existing || existing.userId.toString() !== userId) {
                    throw new exceptions_1.WithdrawalNotFoundException();
                }
                throw new exceptions_1.WithdrawalNotCancellableException();
            }
            const amountToRelease = new decimal_js_1.default(updated.amount.toString()).toNumber();
            await this.walletService.release(userId, amountToRelease, requestId, session, transaction_reference_type_enum_1.TransactionReferenceType.WITHDRAWAL);
            await session.commitTransaction();
            void this.realtimeService.publishWithdrawalStatusChanged(updated);
            return updated;
        }
        catch (error) {
            await session.abortTransaction();
            throw error;
        }
        finally {
            await session.endSession();
        }
    }
    async getMyWithdrawals(userId, pagination, filter) {
        return this.withdrawalRepository.findByUserId(userId, pagination, filter);
    }
    async getMyWithdrawal(userId, id) {
        const request = await this.withdrawalRepository.findById(id);
        if (!request || request.userId.toString() !== userId) {
            throw new exceptions_1.WithdrawalNotFoundException();
        }
        return request;
    }
    async adminGetWithdrawals(pagination, filter) {
        return this.withdrawalRepository.findAll(pagination, filter);
    }
    async adminGetWithdrawal(id) {
        const request = await this.withdrawalRepository.findById(id);
        if (!request) {
            throw new exceptions_1.WithdrawalNotFoundException();
        }
        return request;
    }
    async adminStartProcessing(adminId, requestId) {
        const updated = await this.withdrawalRepository.transitionStatus(requestId, [withdrawal_status_enum_1.WithdrawalStatus.PENDING], withdrawal_status_enum_1.WithdrawalStatus.PROCESSING, {
            processedBy: new mongoose_2.Types.ObjectId(adminId),
            processedAt: new Date(),
        });
        if (!updated) {
            const existing = await this.withdrawalRepository.findById(requestId);
            if (!existing) {
                throw new exceptions_1.WithdrawalNotFoundException();
            }
            throw new exceptions_1.WithdrawalNotPendingException();
        }
        void this.realtimeService.publishWithdrawalStatusChanged(updated);
        return updated;
    }
    async adminCompleteWithdrawal(adminId, input) {
        const session = await this.connection.startSession();
        session.startTransaction();
        try {
            const updated = await this.withdrawalRepository.transitionStatus(input.withdrawalId, [withdrawal_status_enum_1.WithdrawalStatus.PROCESSING, withdrawal_status_enum_1.WithdrawalStatus.PENDING], withdrawal_status_enum_1.WithdrawalStatus.COMPLETED, {
                adminReference: input.adminReference,
                receiptUrl: input.receiptUrl,
                completedAt: new Date(),
                processedBy: new mongoose_2.Types.ObjectId(adminId),
            }, session);
            if (!updated) {
                const existing = await this.withdrawalRepository.findById(input.withdrawalId, session);
                if (!existing) {
                    throw new exceptions_1.WithdrawalNotFoundException();
                }
                throw new exceptions_1.WithdrawalNotInProgressException();
            }
            const amountToCapture = new decimal_js_1.default(updated.amount.toString()).toNumber();
            const netAmountNum = new decimal_js_1.default(updated.netAmount.toString()).toNumber();
            const { transaction: captureTx } = await this.walletService.capture(updated.userId.toString(), amountToCapture, input.withdrawalId, session, transaction_reference_type_enum_1.TransactionReferenceType.WITHDRAWAL);
            const finalUpdated = await this.withdrawalRepository.updateStatus(input.withdrawalId, withdrawal_status_enum_1.WithdrawalStatus.COMPLETED, {
                completionTransactionId: new mongoose_2.Types.ObjectId(captureTx._id.toString()),
            }, session);
            const result = finalUpdated ?? updated;
            await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.WithdrawalCompleted, {
                userId: result.userId.toString(),
                amount: amountToCapture,
                netAmount: netAmountNum,
                transactionId: captureTx._id.toString(),
                adminReference: input.adminReference,
                receiptUrl: input.receiptUrl,
                payoutMethod: result.payoutMethod,
                withdrawalId: result._id.toString(),
            }, session, result._id.toString());
            await session.commitTransaction();
            void this.realtimeService.publishWithdrawalStatusChanged(result);
            return result;
        }
        catch (error) {
            await session.abortTransaction();
            throw error;
        }
        finally {
            await session.endSession();
        }
    }
    async adminRejectWithdrawal(adminId, input) {
        const session = await this.connection.startSession();
        session.startTransaction();
        try {
            const updated = await this.withdrawalRepository.transitionStatus(input.withdrawalId, [withdrawal_status_enum_1.WithdrawalStatus.PENDING, withdrawal_status_enum_1.WithdrawalStatus.PROCESSING], withdrawal_status_enum_1.WithdrawalStatus.REJECTED, {
                rejectionReason: input.rejectionReason,
                processedBy: new mongoose_2.Types.ObjectId(adminId),
                processedAt: new Date(),
            }, session);
            if (!updated) {
                const existing = await this.withdrawalRepository.findById(input.withdrawalId, session);
                if (!existing) {
                    throw new exceptions_1.WithdrawalNotFoundException();
                }
                throw new exceptions_1.WithdrawalNotRejectableException();
            }
            const amountToRelease = new decimal_js_1.default(updated.amount.toString()).toNumber();
            await this.walletService.release(updated.userId.toString(), amountToRelease, input.withdrawalId, session, transaction_reference_type_enum_1.TransactionReferenceType.WITHDRAWAL);
            await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.WithdrawalRejected, {
                userId: updated.userId.toString(),
                amount: amountToRelease,
                withdrawalId: updated._id.toString(),
                rejectionReason: input.rejectionReason,
            }, session, updated._id.toString());
            await session.commitTransaction();
            void this.realtimeService.publishWithdrawalStatusChanged(updated);
            return updated;
        }
        catch (error) {
            await session.abortTransaction();
            throw error;
        }
        finally {
            await session.endSession();
        }
    }
    async adminAdjustBalance(adminId, input) {
        const reasonTag = `ADMIN_ADJUST:${adminId}:${input.reason}`;
        if (input.type === dto_1.AdminAdjustBalanceType.CREDIT) {
            const { wallet } = await this.walletService.deposit(input.userId, input.amount, reasonTag, undefined, 'EGP', transaction_reference_type_enum_1.TransactionReferenceType.TRANSACTION, transaction_type_enum_1.TransactionType.ADMIN_CREDIT);
            this.logger.log(`Admin ${adminId} CREDITED ${input.amount} EGP to User ${input.userId}. Reason: ${input.reason}`);
            return wallet;
        }
        else {
            const { wallet } = await this.walletService.withdraw(input.userId, input.amount, reasonTag, undefined, transaction_reference_type_enum_1.TransactionReferenceType.TRANSACTION, transaction_type_enum_1.TransactionType.ADMIN_DEBIT);
            this.logger.log(`Admin ${adminId} DEBITED ${input.amount} EGP from User ${input.userId}. Reason: ${input.reason}`);
            return wallet;
        }
    }
    async countPendingWithdrawals() {
        return this.withdrawalRepository.countPendingWithdrawals();
    }
    async sumPendingWithdrawals() {
        return this.withdrawalRepository.sumPendingWithdrawals();
    }
    async sumCompletedWithdrawals() {
        return this.withdrawalRepository.sumCompletedWithdrawals();
    }
    async sumCollectedFees() {
        return this.withdrawalRepository.sumCollectedFees();
    }
};
exports.WithdrawalsService = WithdrawalsService;
exports.WithdrawalsService = WithdrawalsService = WithdrawalsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('IWithdrawalRepository')),
    __param(5, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [Object, wallet_service_1.WalletService,
        outbox_service_1.OutboxService,
        realtime_service_1.RealtimeService,
        config_1.ConfigService,
        mongoose_2.Connection])
], WithdrawalsService);
//# sourceMappingURL=withdrawals.service.js.map