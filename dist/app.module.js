"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const users_module_1 = require("./users/users.module");
const auth_module_1 = require("./auth/auth.module");
const apollo_1 = require("@nestjs/apollo");
const graphql_1 = require("@nestjs/graphql");
const path_1 = require("path");
const core_1 = require("@nestjs/core");
const jwt_auth_guard_1 = require("./common/guards/jwt-auth.guard");
const roles_guard_1 = require("./common/guards/roles.guard");
const notifications_module_1 = require("./notifications/notifications.module");
const throttler_1 = require("@nestjs/throttler");
const throttler_storage_redis_1 = require("@nest-lab/throttler-storage-redis");
const throttler_guard_1 = require("./common/guards/throttler.guard");
const ioredis_1 = require("@nestjs-modules/ioredis");
const redis_module_1 = require("./infrastructure/redis/redis.module");
const rabbitmq_module_1 = require("./infrastructure/rabbitmq/rabbitmq.module");
const outbox_module_1 = require("./infrastructure/outbox/outbox.module");
const ip_blacklist_middleware_1 = require("./common/middleware/ip-blacklist.middleware");
const request_context_middleware_1 = require("./common/middleware/request-context.middleware");
const logging_module_1 = require("./infrastructure/logging/logging.module");
const logging_interceptor_1 = require("./common/interceptors/logging.interceptor");
const wallet_module_1 = require("./wallet/wallet.module");
const transaction_module_1 = require("./transaction/transaction.module");
const schedule_1 = require("@nestjs/schedule");
const auctions_module_1 = require("./auctions/auctions.module");
const upload_module_1 = require("./upload/upload.module");
const bids_module_1 = require("./bids/bids.module");
const admin_module_1 = require("./admin/admin.module");
const payment_module_1 = require("./payment/payment.module");
const jwt_1 = require("@nestjs/jwt");
const users_service_1 = require("./users/users.service");
const pubsub_module_1 = require("./infrastructure/pubsub/pubsub.module");
const chat_module_1 = require("./chat/chat.module");
const reviews_module_1 = require("./reviews/reviews.module");
const escrow_module_1 = require("./escrow/escrow.module");
const withdrawals_module_1 = require("./withdrawals/withdrawals.module");
const app_controller_1 = require("./app.controller");
let AppModule = class AppModule {
    configure(consumer) {
        consumer
            .apply(request_context_middleware_1.RequestContextMiddleware, ip_blacklist_middleware_1.IpBlacklistMiddleware)
            .forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            logging_module_1.LoggingModule,
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            throttler_1.ThrottlerModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    throttlers: [
                        {
                            name: 'global',
                            ttl: 60_000,
                            limit: configService.get('THROTTLE_GLOBAL_LIMIT', 100),
                        },
                        {
                            name: 'strict',
                            ttl: 60_000,
                            limit: 99999,
                        },
                    ],
                    storage: new throttler_storage_redis_1.ThrottlerStorageRedisService(configService.getOrThrow('REDIS_URL')),
                }),
            }),
            ioredis_1.RedisModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    type: 'single',
                    url: configService.getOrThrow('REDIS_URL'),
                }),
            }),
            mongoose_1.MongooseModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    uri: configService.get('MONGO_URI') ||
                        configService.get('MONGODB_URI'),
                }),
            }),
            graphql_1.GraphQLModule.forRootAsync({
                driver: apollo_1.ApolloDriver,
                imports: [auth_module_1.AuthModule, users_module_1.UsersModule],
                inject: [jwt_1.JwtService, users_service_1.UsersService],
                useFactory: (jwtService, usersService) => ({
                    autoSchemaFile: (0, path_1.join)(process.cwd(), 'src/schema.gql'),
                    playground: true,
                    subscriptions: {
                        'graphql-ws': {
                            onConnect: async (ctx) => {
                                const params = (ctx.connectionParams || {});
                                const headers = (params.headers || {});
                                const rawToken = params.authorization ||
                                    params.Authorization ||
                                    params.token ||
                                    params.accessToken ||
                                    params.authToken ||
                                    headers.authorization ||
                                    headers.Authorization ||
                                    headers.token;
                                if (!rawToken || typeof rawToken !== 'string') {
                                    return;
                                }
                                const token = rawToken.replace(/^Bearer\s+/i, '').trim();
                                if (!token) {
                                    return;
                                }
                                try {
                                    const payload = jwtService.verify(token);
                                    const user = await usersService.findById(payload.sub);
                                    if (!user || user.isBanned) {
                                        return;
                                    }
                                    ctx.extra.user = {
                                        sub: user._id.toString(),
                                        email: user.email,
                                        role: user.role,
                                    };
                                }
                                catch {
                                }
                            },
                        },
                    },
                    context: (ctx) => {
                        const user = ctx.extra?.user ||
                            ctx.user ||
                            ctx.req?.user;
                        if (ctx.extra || !ctx.res) {
                            if (ctx.req && user) {
                                ctx.req.user = user;
                            }
                            return { req: ctx.req, user, extra: ctx.extra || ctx };
                        }
                        return { req: ctx.req, res: ctx.res, user };
                    },
                }),
            }),
            schedule_1.ScheduleModule.forRoot(),
            pubsub_module_1.PubSubModule,
            redis_module_1.RedisModule,
            rabbitmq_module_1.RabbitMQModule,
            outbox_module_1.OutboxModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            notifications_module_1.NotificationsModule,
            wallet_module_1.WalletModule,
            transaction_module_1.TransactionModule,
            auctions_module_1.AuctionsModule,
            upload_module_1.UploadModule,
            bids_module_1.BidsModule,
            admin_module_1.AdminModule,
            payment_module_1.PaymentModule,
            chat_module_1.ChatModule,
            reviews_module_1.ReviewsModule,
            escrow_module_1.EscrowModule,
            withdrawals_module_1.WithdrawalsModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_1.JwtAuthGuard },
            { provide: core_1.APP_GUARD, useClass: roles_guard_1.RolesGuard },
            { provide: core_1.APP_GUARD, useClass: throttler_guard_1.CustomThrottlerGuard },
            { provide: core_1.APP_INTERCEPTOR, useClass: logging_interceptor_1.LoggingInterceptor },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map