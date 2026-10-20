"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsModule = void 0;
const common_1 = require("@nestjs/common");
const mailer_1 = require("@nestjs-modules/mailer");
const config_1 = require("@nestjs/config");
const handlebars_adapter_1 = require("@nestjs-modules/mailer/adapters/handlebars.adapter");
const path_1 = require("path");
const mongoose_1 = require("@nestjs/mongoose");
const notifications_service_1 = require("./notifications.service");
const email_service_1 = require("./email/email.service");
const in_app_notification_entity_1 = require("./in-app/entities/in-app-notification.entity");
const in_app_notifications_service_1 = require("./in-app/in-app-notifications.service");
const in_app_notifications_resolver_1 = require("./in-app/in-app-notifications.resolver");
const mongo_in_app_notification_repository_1 = require("./in-app/repositories/mongo.in-app-notification.repository");
const rabbitmq_module_1 = require("../infrastructure/rabbitmq/rabbitmq.module");
const redis_module_1 = require("../infrastructure/redis/redis.module");
const users_module_1 = require("../users/users.module");
const notifications_consumer_1 = require("./notifications.consumer");
let NotificationsModule = class NotificationsModule {
};
exports.NotificationsModule = NotificationsModule;
exports.NotificationsModule = NotificationsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: in_app_notification_entity_1.InAppNotification.name, schema: in_app_notification_entity_1.InAppNotificationSchema },
            ]),
            mailer_1.MailerModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    transport: {
                        host: configService.getOrThrow('SMTP_HOST'),
                        port: parseInt(configService.getOrThrow('SMTP_PORT'), 10),
                        secure: configService.get('SMTP_SECURE') === 'true',
                        auth: {
                            user: configService.getOrThrow('SMTP_USER'),
                            pass: configService.getOrThrow('SMTP_PASS'),
                        },
                    },
                    defaults: {
                        from: `"Mazadak Support" <${configService.get('SMTP_FROM')}>`,
                    },
                    template: {
                        dir: (0, path_1.join)(__dirname, 'email', 'templates'),
                        adapter: new handlebars_adapter_1.HandlebarsAdapter(),
                        options: {
                            strict: true,
                        },
                    },
                }),
            }),
            rabbitmq_module_1.RabbitMQModule,
            redis_module_1.RedisModule,
            users_module_1.UsersModule,
        ],
        providers: [
            email_service_1.EmailService,
            notifications_service_1.NotificationsService,
            in_app_notifications_service_1.InAppNotificationsService,
            in_app_notifications_resolver_1.InAppNotificationsResolver,
            {
                provide: 'IInAppNotificationRepository',
                useClass: mongo_in_app_notification_repository_1.MongoInAppNotificationRepository,
            },
            notifications_consumer_1.NotificationsConsumer,
        ],
        exports: [email_service_1.EmailService, notifications_service_1.NotificationsService, in_app_notifications_service_1.InAppNotificationsService],
    })
], NotificationsModule);
//# sourceMappingURL=notifications.module.js.map