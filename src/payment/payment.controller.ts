import {
  Controller,
  Post,
  Req,
  Headers,
  Query,
  Body,
  type RawBodyRequest,
} from '@nestjs/common';
import type { Request } from 'express';
import { PaymentService } from './payment.service';
import { PaymentProviderType } from './enums/payment-provider-type.enum';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import * as JwtPayloadInterface from '../auth/interfaces/jwt-payload.interface';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { PaymentInitResult } from './dto/payment-init-result.type';
import { MissingSignatureHeaderException } from './exceptions/missing-signature-header.exception';
import { MissingRawBodyException } from './exceptions/missing-raw-body.exception';
import { MissingEventIdException } from './exceptions/missing-event-id.exception';
import { MissingHmacSignatureException } from './exceptions/missing-hmac-signature.exception';

interface BaseWebhookPayload {
  id?: string | number;
  hmac?: string;
  obj?: {
    id?: string | number;
    hmac?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('initialize')
  async initializePayment(
    @CurrentUser() currentUser: JwtPayloadInterface.JwtPayload,
    @Body() dto: InitializePaymentDto,
  ): Promise<PaymentInitResult> {
    return this.paymentService.initializePayment(currentUser, dto);
  }

  @Public()
  @Post('webhooks/stripe')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new MissingSignatureHeaderException();
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new MissingRawBodyException();
    }

    const payload = req.body as BaseWebhookPayload;
    const eventId = payload.id?.toString();

    if (!eventId) {
      throw new MissingEventIdException();
    }

    await this.paymentService.handleWebhook(
      PaymentProviderType.STRIPE,
      rawBody,
      signature,
      eventId,
      payload,
    );

    return { received: true };
  }

  @Public()
  @Post('webhooks/paymob')
  async handlePaymobWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Query('hmac') querySignature?: string,
    @Headers('hmac') headerHmac?: string,
    @Headers('x-paymob-hmac') headerXPaymobHmac?: string,
  ) {
    const payload = req.body as BaseWebhookPayload;
    const signature =
      querySignature ||
      headerHmac ||
      headerXPaymobHmac ||
      (typeof payload?.hmac === 'string' ? payload.hmac : undefined) ||
      (typeof payload?.obj?.hmac === 'string' ? payload.obj.hmac : undefined);

    if (!signature) {
      throw new MissingHmacSignatureException();
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new MissingRawBodyException();
    }

    // Paymob obj.id is the transaction id
    const eventId = payload.obj?.id?.toString() || payload.id?.toString();

    if (!eventId) {
      throw new MissingEventIdException();
    }

    await this.paymentService.handleWebhook(
      PaymentProviderType.PAYMOB,
      rawBody,
      signature,
      eventId,
      payload,
    );

    return { received: true };
  }
}
