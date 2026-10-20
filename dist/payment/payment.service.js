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
var PaymentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const rabbitmq_event_types_1 = require("../infrastructure/rabbitmq/rabbitmq-event.types");
const payment_provider_factory_1 = require("./providers/payment-provider.factory");
const outbox_service_1 = require("../infrastructure/outbox/outbox.service");
const transaction_service_1 = require("../transaction/transaction.service");
const wallet_service_1 = require("../wallet/wallet.service");
const transaction_type_enum_1 = require("../transaction/enums/transaction-type.enum");
const transaction_status_enum_1 = require("../transaction/enums/transaction-status.enum");
const transaction_reference_type_enum_1 = require("../transaction/enums/transaction-reference-type.enum");
const crypto_1 = require("crypto");
const webhook_signature_verification_failed_exception_1 = require("./exceptions/webhook-signature-verification-failed.exception");
const decimal_js_1 = __importDefault(require("decimal.js"));
let PaymentService = PaymentService_1 = class PaymentService {
    webhookEventRepository;
    connection;
    providerFactory;
    transactionService;
    outboxService;
    walletService;
    logger = new common_1.Logger(PaymentService_1.name);
    constructor(webhookEventRepository, connection, providerFactory, transactionService, outboxService, walletService) {
        this.webhookEventRepository = webhookEventRepository;
        this.connection = connection;
        this.providerFactory = providerFactory;
        this.transactionService = transactionService;
        this.outboxService = outboxService;
        this.walletService = walletService;
    }
    async handleWebhook(providerType, rawBody, signature, providerEventId, payload) {
        const provider = this.providerFactory.getProvider(providerType);
        const isValid = provider.verifyWebhookSignature(rawBody, signature);
        if (!isValid) {
            this.logger.error(`Invalid webhook signature for provider: ${providerType}`);
            throw new webhook_signature_verification_failed_exception_1.WebhookSignatureVerificationFailedException();
        }
        const session = await this.connection.startSession();
        try {
            session.startTransaction();
            const existingEvent = await this.webhookEventRepository.findOne(providerEventId, session);
            if (existingEvent) {
                this.logger.log(`Webhook event ${providerEventId} already exists. Skipping.`);
                await session.commitTransaction();
                return;
            }
            await this.webhookEventRepository.create({
                providerEventId,
                provider: providerType,
                payload,
                providerSignature: signature,
                processed: false,
            }, session);
            await this.outboxService.saveEvent(rabbitmq_event_types_1.RabbitMQEvent.PaymentWebhookReceived, {
                providerEventId,
                provider: providerType,
                payload,
            }, session, providerEventId);
            await session.commitTransaction();
        }
        catch (err) {
            await session.abortTransaction();
            throw err;
        }
        finally {
            await session.endSession();
        }
    }
    async processPaymentWebhookEvent(event) {
        const { providerEventId, provider, payload } = event;
        const webhookEvent = await this.webhookEventRepository.findOne(providerEventId);
        if (!webhookEvent) {
            this.logger.error(`Webhook event ${providerEventId} not found in database.`);
            return;
        }
        if (webhookEvent.processed) {
            this.logger.log(`Webhook event ${providerEventId} is already processed. Skipping.`);
            return;
        }
        const session = await this.connection.startSession();
        try {
            session.startTransaction();
            const paymentProvider = this.providerFactory.getProvider(provider);
            const { transactionId: internalTransactionId, isSuccess, amountMinorUnits: webhookAmount, currency: webhookCurrency, } = paymentProvider.extractWebhookData(payload);
            if (!internalTransactionId) {
                this.logger.warn(`Could not extract internalTransactionId for webhook ${providerEventId}`);
            }
            else if (webhookCurrency?.toUpperCase() !== 'EGP') {
                this.logger.error(`Unsupported currency received in webhook ${providerEventId}: ${webhookCurrency}`);
            }
            else {
                await this.transactionService.updateTransactionStatusAndEmitOutbox(internalTransactionId, isSuccess ? transaction_status_enum_1.TransactionStatus.SUCCESS : transaction_status_enum_1.TransactionStatus.FAILED, webhookAmount, webhookCurrency, session);
                this.logger.log(`Extracted TransactionId: ${internalTransactionId}, status: ${isSuccess ? transaction_status_enum_1.TransactionStatus.SUCCESS : transaction_status_enum_1.TransactionStatus.FAILED}`);
            }
            webhookEvent.processed = true;
            webhookEvent.processedAt = new Date();
            await this.webhookEventRepository.save(webhookEvent, session);
            await session.commitTransaction();
            this.logger.log(`Successfully processed webhook event ${providerEventId}`);
        }
        catch (error) {
            await session.abortTransaction();
            const err = error;
            this.logger.error(`Failed to process webhook event ${providerEventId}`, err.stack);
            const freshWebhookEvent = await this.webhookEventRepository.findOne(providerEventId);
            if (freshWebhookEvent) {
                freshWebhookEvent.retryCount += 1;
                freshWebhookEvent.errorMessage = err.message;
                await this.webhookEventRepository.save(freshWebhookEvent);
            }
            throw err;
        }
        finally {
            await session.endSession();
        }
    }
    async initializePayment(currentUser, data) {
        const idempotencyKey = (0, crypto_1.randomUUID)();
        const wallet = await this.walletService.getWalletByUserId(currentUser.sub);
        const transaction = await this.transactionService.createTransaction({
            walletId: wallet._id.toString(),
            type: transaction_type_enum_1.TransactionType.DEPOSIT,
            amount: new decimal_js_1.default(data.amount).div(100).toNumber(),
            currency: data.currency || 'EGP',
            status: transaction_status_enum_1.TransactionStatus.PENDING,
            idempotencyKey,
            gatewayProvider: data.provider,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        });
        const transactionId = transaction._id.toString();
        try {
            const provider = this.providerFactory.getProvider(data.provider);
            const gatewayResult = await provider.createPayment({
                amount: data.amount,
                currency: data.currency || 'EGP',
                idempotencyKey,
                metadata: {
                    userId: currentUser.sub,
                    walletId: wallet._id.toString(),
                    transactionId,
                },
                email: currentUser.email,
                firstName: currentUser.firstName,
                lastName: currentUser.lastName,
            });
            await this.transactionService.updateGatewayPaymentIntentId(transactionId, gatewayResult.gatewayPaymentIntentId);
            return {
                gatewayPaymentIntentId: gatewayResult.gatewayPaymentIntentId,
                clientSecret: gatewayResult.clientSecret,
                paymentUrl: gatewayResult.paymentUrl,
                idempotencyKey,
            };
        }
        catch (err) {
            this.logger.error(`Failed to create gateway payment for transaction ${transactionId}: ${err instanceof Error ? err.message : String(err)}`);
            await this.transactionService
                .createTransaction({
                walletId: wallet._id.toString(),
                type: transaction_type_enum_1.TransactionType.DEPOSIT,
                amount: new decimal_js_1.default(data.amount).div(100).toNumber(),
                currency: data.currency,
                status: transaction_status_enum_1.TransactionStatus.FAILED,
                referenceId: transactionId,
                referenceType: transaction_reference_type_enum_1.TransactionReferenceType.TRANSACTION,
                idempotencyKey,
                gatewayProvider: data.provider,
            })
                .catch((createErr) => {
                this.logger.error(`Failed to record FAILED status transition for transaction ${transactionId}: ${createErr instanceof Error ? createErr.message : String(createErr)}`);
            });
            throw err;
        }
    }
};
exports.PaymentService = PaymentService;
exports.PaymentService = PaymentService = PaymentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('IWebhookEventRepository')),
    __param(1, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [Object, mongoose_2.Connection,
        payment_provider_factory_1.PaymentProviderFactory,
        transaction_service_1.TransactionService,
        outbox_service_1.OutboxService,
        wallet_service_1.WalletService])
], PaymentService);
//# sourceMappingURL=payment.service.js.map