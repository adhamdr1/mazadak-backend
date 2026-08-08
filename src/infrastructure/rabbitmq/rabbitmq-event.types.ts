/**
 * All domain events published to RabbitMQ.
 * Format: PascalCase, versioned internally via the envelope.
 */
export enum RabbitMQEvent {
  BidPlaced = 'BidPlaced',
  AuctionStarted = 'AuctionStarted',
  AuctionEnded = 'AuctionEnded',
  AuctionCancelled = 'AuctionCancelled',
  UserRegistered = 'UserRegistered',
  PasswordReset = 'PasswordReset',
  PasswordChanged = 'PasswordChanged',
  WalletDeposited = 'WalletDeposited',
  WithdrawalCompleted = 'WithdrawalCompleted',
  EmailVerified = 'EmailVerified',
  AuctionCancelledByAdmin = 'AuctionCancelledByAdmin',
  PaymentWebhookReceived = 'PaymentWebhookReceived',
  AccountReactivationRequested = 'AccountReactivationRequested',
  AccountReactivated = 'AccountReactivated',
}

// ─── Event Payloads ────────────────────────────────────────────────────────────

export interface BidPlacedPayload {
  bidId: string;
  auctionId: string;
  auctionTitle: string;
  sellerId: string;
  bidderId: string;
  amount: number;
  /** Previous winner who was outbid — undefined if no previous winner */
  outbidUserId?: string;
  outbidTransactionId?: string;
}

export interface AuctionStartedPayload {
  auctionId: string;
  auctionTitle: string;
  sellerId: string;
}

export interface AuctionEndedPayload {
  auctionId: string;
  auctionTitle: string;
  sellerId: string;
  finalPrice: number;
  winnerId?: string;
  captureTransactionId?: string;
  depositTransactionId?: string;
}

export interface AuctionCancelledPayload {
  auctionId: string;
  auctionTitle: string;
  sellerId: string;
  highestBidderId?: string;
  refundAmount?: number;
}

export interface AuctionCancelledByAdminPayload {
  auctionId: string;
  auctionTitle: string;
  sellerId: string;
  adminActionReason: string;
  highestBidderId?: string;
  refundAmount?: number;
}

export interface PaymentWebhookReceivedPayload {
  providerEventId: string;
  provider: string;
  payload: Record<string, any>;
}

export interface UserRegisteredPayload {
  userId: string;
  email: string;
  name: string;
  phone: string;
  verificationToken: string;
}

export interface PasswordResetPayload {
  email: string;
  name: string;
  resetToken: string;
  metadata: { ip: string; browser: string; time: string };
}

export interface PasswordChangedPayload {
  email: string;
  name: string;
  date: string;
}

export interface WalletDepositedPayload {
  userId: string;
  amount: number;
  transactionId: string;
}

export interface WithdrawalCompletedPayload {
  userId: string;
  amount: number;
  transactionId: string;
}

export interface EmailVerifiedPayload {
  userId: string;
  email: string;
  name: string;
}

export interface AccountReactivationRequestedPayload {
  userId: string;
  email: string;
  name: string;
  phone: string;
  verificationToken: string;
}

export interface AccountReactivatedPayload {
  userId: string;
  email: string;
  name: string;
}

/** Union type of all event payloads */
export type RabbitMQEventPayload =
  | BidPlacedPayload
  | AuctionStartedPayload
  | AuctionEndedPayload
  | AuctionCancelledPayload
  | UserRegisteredPayload
  | PasswordResetPayload
  | PasswordChangedPayload
  | WalletDepositedPayload
  | WithdrawalCompletedPayload
  | EmailVerifiedPayload
  | AuctionCancelledByAdminPayload
  | PaymentWebhookReceivedPayload
  | AccountReactivationRequestedPayload
  | AccountReactivatedPayload;

/** Map for Discriminated Union Type Safety */
export type RabbitMQEventMap = {
  [RabbitMQEvent.BidPlaced]: BidPlacedPayload;
  [RabbitMQEvent.AuctionStarted]: AuctionStartedPayload;
  [RabbitMQEvent.AuctionEnded]: AuctionEndedPayload;
  [RabbitMQEvent.AuctionCancelled]: AuctionCancelledPayload;
  [RabbitMQEvent.UserRegistered]: UserRegisteredPayload;
  [RabbitMQEvent.PasswordReset]: PasswordResetPayload;
  [RabbitMQEvent.PasswordChanged]: PasswordChangedPayload;
  [RabbitMQEvent.WalletDeposited]: WalletDepositedPayload;
  [RabbitMQEvent.WithdrawalCompleted]: WithdrawalCompletedPayload;
  [RabbitMQEvent.EmailVerified]: EmailVerifiedPayload;
  [RabbitMQEvent.AuctionCancelledByAdmin]: AuctionCancelledByAdminPayload;
  [RabbitMQEvent.PaymentWebhookReceived]: PaymentWebhookReceivedPayload;
  [RabbitMQEvent.AccountReactivationRequested]: AccountReactivationRequestedPayload;
  [RabbitMQEvent.AccountReactivated]: AccountReactivatedPayload;
};

/** The parsed message with full type inference based on eventType */
export type RabbitMQParsedMessage = {
  [K in RabbitMQEvent]: {
    messageId: string;
    eventType: K;
    payload: RabbitMQEventMap[K];
    correlationId: string;
    timestamp: string;
  };
}[RabbitMQEvent];
