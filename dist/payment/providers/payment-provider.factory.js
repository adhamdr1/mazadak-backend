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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentProviderFactory = void 0;
const common_1 = require("@nestjs/common");
const stripe_provider_1 = require("./stripe.provider");
const paymob_provider_1 = require("./paymob.provider");
const payment_provider_type_enum_1 = require("../enums/payment-provider-type.enum");
const unsupported_payment_provider_exception_1 = require("../exceptions/unsupported-payment-provider.exception");
let PaymentProviderFactory = class PaymentProviderFactory {
    stripeProvider;
    paymobProvider;
    constructor(stripeProvider, paymobProvider) {
        this.stripeProvider = stripeProvider;
        this.paymobProvider = paymobProvider;
    }
    getProvider(provider) {
        switch (provider) {
            case payment_provider_type_enum_1.PaymentProviderType.STRIPE:
                return this.stripeProvider;
            case payment_provider_type_enum_1.PaymentProviderType.PAYMOB:
                return this.paymobProvider;
            default:
                throw new unsupported_payment_provider_exception_1.UnsupportedPaymentProviderException(provider);
        }
    }
};
exports.PaymentProviderFactory = PaymentProviderFactory;
exports.PaymentProviderFactory = PaymentProviderFactory = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [stripe_provider_1.StripeProvider,
        paymob_provider_1.PaymobProvider])
], PaymentProviderFactory);
//# sourceMappingURL=payment-provider.factory.js.map