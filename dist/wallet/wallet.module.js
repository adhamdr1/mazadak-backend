"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const wallet_service_1 = require("./wallet.service");
const wallet_resolver_1 = require("./wallet.resolver");
const wallet_consumer_1 = require("./consumers/wallet.consumer");
const wallet_entity_1 = require("./entities/wallet.entity");
const mongo_wallet_repository_1 = require("./repositories/mongo.wallet.repository");
const transaction_module_1 = require("../transaction/transaction.module");
const notifications_module_1 = require("../notifications/notifications.module");
const outbox_module_1 = require("../infrastructure/outbox/outbox.module");
const cqrs_1 = require("@nestjs/cqrs");
const get_wallet_balance_handler_1 = require("./queries/handlers/get-wallet-balance.handler");
let WalletModule = class WalletModule {
};
exports.WalletModule = WalletModule;
exports.WalletModule = WalletModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([{ name: wallet_entity_1.Wallet.name, schema: wallet_entity_1.WalletSchema }]),
            transaction_module_1.TransactionModule,
            notifications_module_1.NotificationsModule,
            outbox_module_1.OutboxModule,
            cqrs_1.CqrsModule,
        ],
        providers: [
            wallet_resolver_1.WalletResolver,
            wallet_service_1.WalletService,
            wallet_consumer_1.WalletConsumer,
            get_wallet_balance_handler_1.GetWalletBalanceHandler,
            {
                provide: 'IWalletRepository',
                useClass: mongo_wallet_repository_1.MongoWalletRepository,
            },
        ],
        exports: [wallet_service_1.WalletService],
    })
], WalletModule);
//# sourceMappingURL=wallet.module.js.map