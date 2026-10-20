"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const mongoose_1 = require("@nestjs/mongoose");
const config_1 = require("@nestjs/config");
const auth_service_1 = require("./auth.service");
const auth_resolver_1 = require("./auth.resolver");
const mongo_auth_repository_1 = require("./repositories/mongo.auth.repository");
const refresh_token_entity_1 = require("./entities/refresh-token.entity");
const users_module_1 = require("../users/users.module");
const passport_1 = require("@nestjs/passport");
const jwt_strategy_1 = require("./strategies/jwt.strategy");
const wallet_module_1 = require("../wallet/wallet.module");
const auth_consumer_1 = require("./consumers/auth.consumer");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            users_module_1.UsersModule,
            wallet_module_1.WalletModule,
            passport_1.PassportModule.register({ defaultStrategy: 'jwt' }),
            mongoose_1.MongooseModule.forFeature([
                { name: refresh_token_entity_1.RefreshToken.name, schema: refresh_token_entity_1.RefreshTokenSchema },
            ]),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    secret: configService.get('JWT_SECRET'),
                    signOptions: {
                        expiresIn: configService.get('JWT_EXPIRES_IN', '15m'),
                    },
                }),
            }),
        ],
        providers: [
            auth_resolver_1.AuthResolver,
            auth_service_1.AuthService,
            jwt_strategy_1.JwtStrategy,
            auth_consumer_1.AuthConsumer,
            {
                provide: 'IAuthRepository',
                useClass: mongo_auth_repository_1.MongoAuthRepository,
            },
        ],
        exports: [jwt_1.JwtModule],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map