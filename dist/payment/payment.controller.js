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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentController = void 0;
const common_1 = require("@nestjs/common");
const payment_service_1 = require("./payment.service");
const payment_provider_type_enum_1 = require("./enums/payment-provider-type.enum");
const public_decorator_1 = require("../common/decorators/public.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const JwtPayloadInterface = __importStar(require("../auth/interfaces/jwt-payload.interface"));
const initialize_payment_dto_1 = require("./dto/initialize-payment.dto");
const missing_signature_header_exception_1 = require("./exceptions/missing-signature-header.exception");
const missing_raw_body_exception_1 = require("./exceptions/missing-raw-body.exception");
const missing_event_id_exception_1 = require("./exceptions/missing-event-id.exception");
const missing_hmac_signature_exception_1 = require("./exceptions/missing-hmac-signature.exception");
let PaymentController = class PaymentController {
    paymentService;
    constructor(paymentService) {
        this.paymentService = paymentService;
    }
    async initializePayment(currentUser, dto) {
        return this.paymentService.initializePayment(currentUser, dto);
    }
    async handleStripeWebhook(req, signature) {
        if (!signature) {
            throw new missing_signature_header_exception_1.MissingSignatureHeaderException();
        }
        const rawBody = req.rawBody;
        if (!rawBody) {
            throw new missing_raw_body_exception_1.MissingRawBodyException();
        }
        const payload = req.body;
        const eventId = payload.id?.toString();
        if (!eventId) {
            throw new missing_event_id_exception_1.MissingEventIdException();
        }
        await this.paymentService.handleWebhook(payment_provider_type_enum_1.PaymentProviderType.STRIPE, rawBody, signature, eventId, payload);
        return { received: true };
    }
    async handlePaymobWebhook(req, querySignature, headerHmac, headerXPaymobHmac) {
        const payload = req.body;
        const signature = querySignature ||
            headerHmac ||
            headerXPaymobHmac ||
            (typeof payload?.hmac === 'string' ? payload.hmac : undefined) ||
            (typeof payload?.obj?.hmac === 'string' ? payload.obj.hmac : undefined);
        if (!signature) {
            throw new missing_hmac_signature_exception_1.MissingHmacSignatureException();
        }
        const rawBody = req.rawBody;
        if (!rawBody) {
            throw new missing_raw_body_exception_1.MissingRawBodyException();
        }
        const eventId = payload.obj?.id?.toString() || payload.id?.toString();
        if (!eventId) {
            throw new missing_event_id_exception_1.MissingEventIdException();
        }
        await this.paymentService.handleWebhook(payment_provider_type_enum_1.PaymentProviderType.PAYMOB, rawBody, signature, eventId, payload);
        return { received: true };
    }
};
exports.PaymentController = PaymentController;
__decorate([
    (0, common_1.Post)('initialize'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, initialize_payment_dto_1.InitializePaymentDto]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "initializePayment", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('webhooks/stripe'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('stripe-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "handleStripeWebhook", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('webhooks/paymob'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('hmac')),
    __param(2, (0, common_1.Headers)('hmac')),
    __param(3, (0, common_1.Headers)('x-paymob-hmac')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "handlePaymobWebhook", null);
exports.PaymentController = PaymentController = __decorate([
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [payment_service_1.PaymentService])
], PaymentController);
//# sourceMappingURL=payment.controller.js.map