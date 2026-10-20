"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const transaction_service_1 = require("./transaction.service");
const transaction_resolver_1 = require("./transaction.resolver");
const transaction_entity_1 = require("./entities/transaction.entity");
const mongo_transaction_repository_1 = require("./repositories/mongo.transaction.repository");
const outbox_module_1 = require("../infrastructure/outbox/outbox.module");
let TransactionModule = class TransactionModule {
};
exports.TransactionModule = TransactionModule;
exports.TransactionModule = TransactionModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: transaction_entity_1.Transaction.name, schema: transaction_entity_1.TransactionSchema },
            ]),
            outbox_module_1.OutboxModule,
        ],
        providers: [
            transaction_resolver_1.TransactionResolver,
            transaction_service_1.TransactionService,
            {
                provide: 'ITransactionRepository',
                useClass: mongo_transaction_repository_1.MongoTransactionRepository,
            },
        ],
        exports: [transaction_service_1.TransactionService, 'ITransactionRepository'],
    })
], TransactionModule);
//# sourceMappingURL=transaction.module.js.map