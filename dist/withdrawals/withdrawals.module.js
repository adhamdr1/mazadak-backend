"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawalsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const withdrawal_request_entity_1 = require("./entities/withdrawal-request.entity");
const withdrawals_service_1 = require("./withdrawals.service");
const withdrawals_resolver_1 = require("./withdrawals.resolver");
const mongo_withdrawal_repository_1 = require("./repositories/mongo.withdrawal.repository");
const wallet_module_1 = require("../wallet/wallet.module");
const outbox_module_1 = require("../infrastructure/outbox/outbox.module");
let WithdrawalsModule = class WithdrawalsModule {
};
exports.WithdrawalsModule = WithdrawalsModule;
exports.WithdrawalsModule = WithdrawalsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: withdrawal_request_entity_1.WithdrawalRequest.name, schema: withdrawal_request_entity_1.WithdrawalRequestSchema },
            ]),
            wallet_module_1.WalletModule,
            outbox_module_1.OutboxModule,
        ],
        providers: [
            withdrawals_service_1.WithdrawalsService,
            withdrawals_resolver_1.WithdrawalsResolver,
            {
                provide: 'IWithdrawalRepository',
                useClass: mongo_withdrawal_repository_1.MongoWithdrawalRepository,
            },
        ],
        exports: [withdrawals_service_1.WithdrawalsService, 'IWithdrawalRepository'],
    })
], WithdrawalsModule);
//# sourceMappingURL=withdrawals.module.js.map