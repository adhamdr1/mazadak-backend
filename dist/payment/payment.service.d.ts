import { Connection } from 'mongoose';
import { PaymentWebhookReceivedPayload } from '../infrastructure/rabbitmq/rabbitmq-event.types';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { PaymentProviderType } from './enums/payment-provider-type.enum';
import { OutboxService } from '../infrastructure/outbox/outbox.service';
import { TransactionService } from '../transaction/transaction.service';
import { WalletService } from '../wallet/wallet.service';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { PaymentInitResult } from './dto/payment-init-result.type';
import { type IWebhookEventRepository } from './interfaces/webhook-event.repository.interface';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
export declare class PaymentService {
    private readonly webhookEventRepository;
    private readonly connection;
    private readonly providerFactory;
    private readonly transactionService;
    private readonly outboxService;
    private readonly walletService;
    private readonly logger;
    constructor(webhookEventRepository: IWebhookEventRepository, connection: Connection, providerFactory: PaymentProviderFactory, transactionService: TransactionService, outboxService: OutboxService, walletService: WalletService);
    handleWebhook(providerType: PaymentProviderType, rawBody: Buffer, signature: string, providerEventId: string, payload: Record<string, unknown>): Promise<void>;
    processPaymentWebhookEvent(event: PaymentWebhookReceivedPayload): Promise<void>;
    initializePayment(currentUser: JwtPayload, data: InitializePaymentDto): Promise<PaymentInitResult>;
}
