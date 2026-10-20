"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const webhook_event_entity_1 = require("./entities/webhook-event.entity");
const payment_controller_1 = require("./payment.controller");
const payment_service_1 = require("./payment.service");
const payment_provider_factory_1 = require("./providers/payment-provider.factory");
const stripe_provider_1 = require("./providers/stripe.provider");
const paymob_provider_1 = require("./providers/paymob.provider");
const rabbitmq_module_1 = require("../infrastructure/rabbitmq/rabbitmq.module");
const transaction_module_1 = require("../transaction/transaction.module");
const outbox_module_1 = require("../infrastructure/outbox/outbox.module");
const wallet_module_1 = require("../wallet/wallet.module");
const webhook_consumer_1 = require("./consumers/webhook.consumer");
const reconciliation_service_1 = require("./reconciliation.service");
const payment_expiration_service_1 = require("./payment-expiration.service");
const mongo_webhook_event_repository_1 = require("./repositories/mongo.webhook-event.repository");
let PaymentModule = class PaymentModule {
};
exports.PaymentModule = PaymentModule;
exports.PaymentModule = PaymentModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: webhook_event_entity_1.WebhookEvent.name, schema: webhook_event_entity_1.WebhookEventSchema },
            ]),
            rabbitmq_module_1.RabbitMQModule,
            transaction_module_1.TransactionModule,
            outbox_module_1.OutboxModule,
            wallet_module_1.WalletModule,
        ],
        controllers: [payment_controller_1.PaymentController],
        providers: [
            payment_service_1.PaymentService,
            payment_provider_factory_1.PaymentProviderFactory,
            stripe_provider_1.StripeProvider,
            paymob_provider_1.PaymobProvider,
            webhook_consumer_1.WebhookConsumer,
            reconciliation_service_1.ReconciliationService,
            payment_expiration_service_1.PaymentExpirationService,
            {
                provide: 'IWebhookEventRepository',
                useClass: mongo_webhook_event_repository_1.MongoWebhookEventRepository,
            },
        ],
        exports: [payment_service_1.PaymentService, payment_provider_factory_1.PaymentProviderFactory, 'IWebhookEventRepository'],
    })
], PaymentModule);
//# sourceMappingURL=payment.module.js.map