"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var PaymobProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymobProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const payment_status_enum_1 = require("../enums/payment-status.enum");
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
let PaymobProvider = PaymobProvider_1 = class PaymobProvider {
    configService;
    logger = new common_1.Logger(PaymobProvider_1.name);
    secretKey;
    publicKey;
    apiKey;
    hmacSecret;
    integrationIds;
    apiBaseUrl;
    constructor(configService) {
        this.configService = configService;
        this.secretKey = this.configService.get('PAYMOB_SECRET_KEY') || '';
        this.publicKey = this.configService.get('PAYMOB_PUBLIC_KEY') || '';
        this.apiKey = this.configService.get('PAYMOB_API_KEY') || '';
        this.hmacSecret =
            this.configService.get('PAYMOB_HMAC_SECRET') || '';
        const integrationIdsRaw = this.configService.get('PAYMOB_INTEGRATION_IDS');
        if (integrationIdsRaw) {
            this.integrationIds = integrationIdsRaw
                .split(',')
                .map((id) => Number(id.trim()))
                .filter((id) => !isNaN(id) && id > 0);
        }
        else {
            const singleId = this.configService.get('PAYMOB_INTEGRATION_ID');
            this.integrationIds = singleId ? [Number(singleId)] : [];
            if (this.integrationIds.length === 0) {
                this.logger.warn('No Paymob Integration IDs configured in PAYMOB_INTEGRATION_IDS or PAYMOB_INTEGRATION_ID');
            }
        }
        const rawBaseUrl = this.configService.get('PAYMOB_API_BASE_URL') ||
            'https://accept.paymob.com';
        this.apiBaseUrl = rawBaseUrl.replace(/\/+$/, '').replace(/\/api$/, '');
    }
    async createPayment(data) {
        try {
            const specialReference = data.metadata?.transactionId || data.idempotencyKey;
            const payload = {
                amount: data.amount,
                currency: data.currency.toUpperCase(),
                payment_methods: this.integrationIds,
                items: [
                    {
                        name: 'Wallet Deposit',
                        amount: data.amount,
                        description: 'Mazadak Wallet Deposit',
                        quantity: 1,
                    },
                ],
                billing_data: {
                    apartment: 'NA',
                    first_name: data.firstName || 'Customer',
                    last_name: data.lastName || 'User',
                    street: 'NA',
                    building: 'NA',
                    phone_number: data.phone || '+201000000000',
                    city: 'Cairo',
                    country: 'EGY',
                    email: data.email || 'customer@mazadak.com',
                    floor: 'NA',
                    state: 'Cairo',
                    shipping_method: 'NA',
                    postal_code: 'NA',
                },
                customer: {
                    first_name: data.firstName || 'Customer',
                    last_name: data.lastName || 'User',
                    email: data.email || 'customer@mazadak.com',
                },
                special_reference: specialReference,
            };
            const response = await axios_1.default.post(`${this.apiBaseUrl}/v1/intention/`, payload, {
                headers: {
                    Authorization: `Token ${this.secretKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 10000,
            });
            const clientSecret = response.data.client_secret;
            const gatewayPaymentIntentId = response.data.id?.toString() ||
                response.data.intention_order_id?.toString() ||
                specialReference;
            const paymentUrl = `https://accept.paymob.com/unifiedcheckout/?publicKey=${this.publicKey}&clientSecret=${clientSecret}`;
            return {
                gatewayPaymentIntentId,
                clientSecret,
                paymentUrl,
            };
        }
        catch (error) {
            const err = error;
            this.logger.error(`Failed to create Paymob Intention payment: ${err.message}`, err.stack);
            throw new common_1.InternalServerErrorException('Payment creation failed');
        }
    }
    verifyWebhookSignature(rawBody, signature, secret) {
        try {
            if (!signature) {
                return false;
            }
            const body = JSON.parse(rawBody.toString());
            const obj = body.obj;
            if (!obj)
                return false;
            const concatenatedString = [
                obj.amount_cents,
                obj.created_at,
                obj.currency,
                obj.error_occured,
                obj.has_parent_transaction,
                obj.id,
                obj.integration_id,
                obj.is_3d_secure,
                obj.is_auth,
                obj.is_capture,
                obj.is_refunded,
                obj.is_standalone_payment,
                obj.is_voided,
                obj.order?.id,
                obj.owner,
                obj.pending,
                obj.source_data?.pan,
                obj.source_data?.sub_type,
                obj.source_data?.type,
                obj.success,
            ].join('');
            const hmac = crypto.createHmac('sha512', secret || this.hmacSecret);
            hmac.update(concatenatedString);
            const calculatedHmac = hmac.digest('hex');
            const calculatedBuf = Buffer.from(calculatedHmac, 'hex');
            const signatureBuf = Buffer.from(signature, 'hex');
            if (calculatedBuf.length !== signatureBuf.length) {
                return false;
            }
            return crypto.timingSafeEqual(calculatedBuf, signatureBuf);
        }
        catch (error) {
            this.logger.error(`Paymob Webhook Signature Verification Failed: ${String(error)}`);
            return false;
        }
    }
    extractWebhookData(payload) {
        const paymobPayload = payload;
        const obj = paymobPayload.obj;
        const transactionId = obj?.special_reference ??
            paymobPayload?.special_reference ??
            obj?.order?.merchant_order_id ??
            obj?.merchant_order_id;
        const success = obj?.success;
        const isSuccess = (success === true || success === 'true') &&
            obj?.pending !== true &&
            obj?.is_voided !== true &&
            obj?.is_refunded !== true &&
            obj?.error_occured !== true;
        const amountMinorUnits = Number(obj?.amount_cents || 0);
        const rawCurrency = obj?.currency;
        const currency = String(rawCurrency || 'EGP').toUpperCase();
        return {
            transactionId: transactionId || undefined,
            isSuccess,
            amountMinorUnits,
            currency,
        };
    }
    async getAuthToken() {
        const authResponse = await axios_1.default.post(`${this.apiBaseUrl}/api/auth/tokens`, {
            api_key: this.apiKey,
        }, { timeout: 10000 });
        return authResponse.data.token;
    }
    async refund(data) {
        try {
            const token = await this.getAuthToken();
            await axios_1.default.post(`${this.apiBaseUrl}/api/acceptance/void_refund/refund`, {
                auth_token: token,
                transaction_id: Number(data.gatewayPaymentIntentId),
                amount_cents: data.amount,
            }, { timeout: 10000 });
            this.logger.log(`Successfully refunded Paymob transaction ${data.gatewayPaymentIntentId} with amount ${data.amount}`);
        }
        catch (error) {
            const err = error;
            this.logger.error(`Failed to refund Paymob payment: ${err.message}`, err.stack);
            throw err;
        }
    }
    async getPaymentStatus(gatewayPaymentIntentId) {
        try {
            if (this.secretKey) {
                try {
                    const response = await axios_1.default.get(`${this.apiBaseUrl}/v1/intention/${gatewayPaymentIntentId}/`, {
                        headers: {
                            Authorization: `Token ${this.secretKey}`,
                        },
                        timeout: 10000,
                    });
                    const resData = response.data;
                    let status = payment_status_enum_1.PaymentStatus.PENDING;
                    const paidAmount = Number(resData.paid_amount_cents ??
                        resData.intention_order?.paid_amount_cents ??
                        0);
                    if (paidAmount > 0 ||
                        resData.status === 'success' ||
                        resData.status === 'CONFIRMED') {
                        status = payment_status_enum_1.PaymentStatus.SUCCESS;
                    }
                    else if (resData.is_voided || resData.status === 'failed') {
                        status = payment_status_enum_1.PaymentStatus.FAILED;
                    }
                    return {
                        status,
                        gatewayTransactionId: gatewayPaymentIntentId,
                    };
                }
                catch {
                }
            }
            if (this.apiKey) {
                const token = await this.getAuthToken();
                const response = await axios_1.default.get(`${this.apiBaseUrl}/api/ecommerce/orders/${gatewayPaymentIntentId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    timeout: 10000,
                });
                const order = response.data;
                let status = payment_status_enum_1.PaymentStatus.PENDING;
                if (order.paid_amount_cents > 0) {
                    status = payment_status_enum_1.PaymentStatus.SUCCESS;
                }
                else if (order.is_voided) {
                    status = payment_status_enum_1.PaymentStatus.FAILED;
                }
                return {
                    status,
                    gatewayTransactionId: gatewayPaymentIntentId,
                };
            }
            return {
                status: payment_status_enum_1.PaymentStatus.PENDING,
                gatewayTransactionId: gatewayPaymentIntentId,
            };
        }
        catch (error) {
            const err = error;
            this.logger.warn(`Could not retrieve Paymob status for ${gatewayPaymentIntentId}: ${err.message}`);
            return {
                status: payment_status_enum_1.PaymentStatus.PENDING,
                gatewayTransactionId: gatewayPaymentIntentId,
            };
        }
    }
};
exports.PaymobProvider = PaymobProvider;
exports.PaymobProvider = PaymobProvider = PaymobProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PaymobProvider);
//# sourceMappingURL=paymob.provider.js.map