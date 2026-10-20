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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var StripeProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const payment_status_enum_1 = require("../enums/payment-status.enum");
const webhook_event_constants_1 = require("../constants/webhook-event-constants");
const stripe_1 = __importDefault(require("stripe"));
let StripeProvider = StripeProvider_1 = class StripeProvider {
    configService;
    logger = new common_1.Logger(StripeProvider_1.name);
    stripe = null;
    endpointSecret;
    isMock;
    constructor(configService) {
        this.configService = configService;
        const secret = this.configService.getOrThrow('STRIPE_SECRET_KEY');
        this.isMock = secret === 'sk_test_mock';
        if (!this.isMock) {
            this.stripe = new stripe_1.default(secret, {
                apiVersion: stripe_1.default.API_VERSION,
            });
        }
        this.endpointSecret = this.configService.getOrThrow('STRIPE_WEBHOOK_SECRET');
    }
    async createPayment(data) {
        if (this.isMock) {
            this.logger.log('Mocking Stripe PaymentIntent creation for testing...');
            const mockIntentId = 'pi_mock_' + Math.floor(Math.random() * 100000);
            const mockClientSecret = `${mockIntentId}_secret_${Date.now()}`;
            return {
                gatewayPaymentIntentId: mockIntentId,
                clientSecret: mockClientSecret,
                paymentUrl: null,
            };
        }
        try {
            if (!this.stripe) {
                throw new Error('Stripe client is not initialized');
            }
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: data.amount,
                currency: data.currency.toLowerCase(),
                metadata: data.metadata,
                receipt_email: data.email,
            }, {
                idempotencyKey: data.idempotencyKey,
            });
            return {
                gatewayPaymentIntentId: paymentIntent.id,
                clientSecret: paymentIntent.client_secret,
                paymentUrl: null,
            };
        }
        catch (error) {
            const err = error;
            this.logger.error(`Failed to create Stripe PaymentIntent: ${err.message}`, err.stack);
            throw err;
        }
    }
    verifyWebhookSignature(rawBody, signature, secret) {
        if (this.isMock || this.endpointSecret === 'whsec_mock') {
            this.logger.log('Bypassing Stripe signature verification for mock testing...');
            return true;
        }
        try {
            if (!this.stripe) {
                throw new Error('Stripe client is not initialized');
            }
            const webhookSecret = secret || this.endpointSecret;
            this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
            return true;
        }
        catch (error) {
            const err = error;
            this.logger.error(`Stripe Webhook Signature Verification Failed: ${err.message}`);
            return false;
        }
    }
    async refund(data) {
        if (this.isMock) {
            this.logger.log(`Mocking Stripe refund for PaymentIntent ${data.gatewayPaymentIntentId} with amount ${data.amount}`);
            return;
        }
        try {
            if (!this.stripe) {
                throw new Error('Stripe client is not initialized');
            }
            await this.stripe.refunds.create({
                payment_intent: data.gatewayPaymentIntentId,
                amount: data.amount,
                reason: data.reason,
            });
            this.logger.log(`Successfully refunded Stripe PaymentIntent ${data.gatewayPaymentIntentId} with amount ${data.amount}`);
        }
        catch (error) {
            const err = error;
            this.logger.error(`Failed to refund Stripe PaymentIntent: ${err.message}`, err.stack);
            throw err;
        }
    }
    async getPaymentStatus(gatewayPaymentIntentId) {
        if (this.isMock) {
            this.logger.log(`Mocking Stripe getPaymentStatus for: ${gatewayPaymentIntentId}`);
            return {
                status: payment_status_enum_1.PaymentStatus.SUCCESS,
                gatewayTransactionId: 'ch_mock_' + gatewayPaymentIntentId.split('_')[2],
            };
        }
        try {
            if (!this.stripe) {
                throw new Error('Stripe client is not initialized');
            }
            const paymentIntent = await this.stripe.paymentIntents.retrieve(gatewayPaymentIntentId);
            let status = payment_status_enum_1.PaymentStatus.PENDING;
            if (paymentIntent.status === 'succeeded') {
                status = payment_status_enum_1.PaymentStatus.SUCCESS;
            }
            else if (paymentIntent.status === 'canceled' ||
                paymentIntent.status === 'requires_payment_method') {
                status = payment_status_enum_1.PaymentStatus.FAILED;
            }
            let chargeId;
            if (typeof paymentIntent.latest_charge === 'string') {
                chargeId = paymentIntent.latest_charge;
            }
            else if (paymentIntent.latest_charge &&
                typeof paymentIntent.latest_charge === 'object') {
                chargeId = paymentIntent.latest_charge.id;
            }
            return {
                status,
                gatewayTransactionId: chargeId,
            };
        }
        catch (error) {
            const err = error;
            this.logger.error(`Failed to retrieve Stripe PaymentIntent status: ${err.message}`, err.stack);
            throw err;
        }
    }
    extractWebhookData(payload) {
        const stripePayload = payload;
        const eventType = stripePayload.type;
        const dataObj = stripePayload.data?.object;
        const transactionId = dataObj?.metadata?.transactionId;
        const isSuccess = eventType === webhook_event_constants_1.StripeWebhookEvent.PaymentIntentSucceeded;
        const amountMinorUnits = Number(dataObj?.amount || 0);
        const rawCurrency = dataObj?.currency;
        const currency = String(rawCurrency || 'EGP').toUpperCase();
        return {
            transactionId,
            isSuccess,
            amountMinorUnits,
            currency,
        };
    }
};
exports.StripeProvider = StripeProvider;
exports.StripeProvider = StripeProvider = StripeProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StripeProvider);
//# sourceMappingURL=stripe.provider.js.map