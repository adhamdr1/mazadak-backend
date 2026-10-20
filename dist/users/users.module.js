"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const users_service_1 = require("./users.service");
const users_resolver_1 = require("./users.resolver");
const user_entity_1 = require("./entities/user.entity");
const mongo_user_repository_1 = require("./repositories/mongo.user.repository");
const cqrs_1 = require("@nestjs/cqrs");
const outbox_module_1 = require("../infrastructure/outbox/outbox.module");
const get_user_public_profile_handler_1 = require("./queries/handlers/get-user-public-profile.handler");
let UsersModule = class UsersModule {
};
exports.UsersModule = UsersModule;
exports.UsersModule = UsersModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([{ name: user_entity_1.User.name, schema: user_entity_1.UserSchema }]),
            cqrs_1.CqrsModule,
            outbox_module_1.OutboxModule,
        ],
        providers: [
            users_resolver_1.UsersResolver,
            users_service_1.UsersService,
            get_user_public_profile_handler_1.GetUserPublicProfileHandler,
            {
                provide: 'IUserRepository',
                useClass: mongo_user_repository_1.MongoUserRepository,
            },
        ],
        exports: [users_service_1.UsersService],
    })
], UsersModule);
//# sourceMappingURL=users.module.js.map