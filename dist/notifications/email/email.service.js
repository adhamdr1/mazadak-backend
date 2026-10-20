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
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const mailer_1 = require("@nestjs-modules/mailer");
const notification_failed_exception_1 = require("../exceptions/notification-failed.exception");
let EmailService = EmailService_1 = class EmailService {
    mailerService;
    logger = new common_1.Logger(EmailService_1.name);
    constructor(mailerService) {
        this.mailerService = mailerService;
    }
    async send(to, subject, template, context) {
        try {
            await this.mailerService.sendMail({
                to,
                subject,
                template,
                context,
            });
            this.logger.log(`Email successfully sent to: ${to}`);
        }
        catch (error) {
            this.logger.error(`Failed to send email to ${to}`, error instanceof Error ? error.stack : String(error));
            throw new notification_failed_exception_1.NotificationFailedException('Email Service Error', error);
        }
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [mailer_1.MailerService])
], EmailService);
//# sourceMappingURL=email.service.js.map