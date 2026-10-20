import { MailerService } from '@nestjs-modules/mailer';
import { INotificationProvider } from '../interfaces/notification-provider.interface';
export declare class EmailService implements INotificationProvider {
    private readonly mailerService;
    private readonly logger;
    constructor(mailerService: MailerService);
    send(to: string, subject: string, template: string, context: Record<string, unknown>): Promise<void>;
}
