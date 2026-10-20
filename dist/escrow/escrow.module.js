"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscrowModule = void 0;
const common_1 = require("@nestjs/common");
const cqrs_1 = require("@nestjs/cqrs");
const mongoose_1 = require("@nestjs/mongoose");
const entities_1 = require("./entities");
const user_entity_1 = require("../users/entities/user.entity");
const services_1 = require("./services");
const repositories_1 = require("./repositories");
const resolvers_1 = require("./resolvers");
const wallet_module_1 = require("../wallet/wallet.module");
const outbox_module_1 = require("../infrastructure/outbox/outbox.module");
let EscrowModule = class EscrowModule {
};
exports.EscrowModule = EscrowModule;
exports.EscrowModule = EscrowModule = __decorate([
    (0, common_1.Module)({
        imports: [
            cqrs_1.CqrsModule,
            mongoose_1.MongooseModule.forFeature([
                { name: entities_1.Escrow.name, schema: entities_1.EscrowSchema },
                { name: entities_1.Dispute.name, schema: entities_1.DisputeSchema },
                { name: user_entity_1.User.name, schema: user_entity_1.UserSchema },
            ]),
            wallet_module_1.WalletModule,
            outbox_module_1.OutboxModule,
        ],
        providers: [
            services_1.EscrowService,
            services_1.DisputesService,
            services_1.EscrowExpirationService,
            resolvers_1.EscrowResolver,
            resolvers_1.DisputesResolver,
            {
                provide: 'IEscrowRepository',
                useClass: repositories_1.MongoEscrowRepository,
            },
            {
                provide: 'IDisputeRepository',
                useClass: repositories_1.MongoDisputeRepository,
            },
        ],
        exports: [
            services_1.EscrowService,
            services_1.DisputesService,
            'IEscrowRepository',
            'IDisputeRepository',
        ],
    })
], EscrowModule);
//# sourceMappingURL=escrow.module.js.map