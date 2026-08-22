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
  UserBanned = 'UserBanned',
  WalletDepositInitiated = 'WalletDepositInitiated',
  UserSoftDeleted = 'UserSoftDeleted',
  ChatMessageSent = 'ChatMessageSent',
  ReviewCreated = 'ReviewCreated',
  ReviewPublished = 'ReviewPublished',
  ReviewReplied = 'ReviewReplied',
  AutoBidPlaced = 'AutoBidPlaced',
  AutoBidExhausted = 'AutoBidExhausted',
  EscrowCreated = 'EscrowCreated',
  EscrowReleased = 'EscrowReleased',
  EscrowRefunded = 'EscrowRefunded',
  EscrowDisputed = 'EscrowDisputed',
  DisputeOpened = 'DisputeOpened',
  DisputeResolved = 'DisputeResolved',
  DisputeCancelled = 'DisputeCancelled',
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

export interface AutoBidPlacedPayload {
  bidId: string;
  auctionId: string;
  auctionTitle: string;
  bidderId: string;
  amount: number;
  isAutoBid: boolean;
}

export interface AutoBidExhaustedPayload {
  autoBidId: string;
  auctionId: string;
  auctionTitle: string;
  userId: string;
  maxAmount: number;
  currentPrice: number;
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
  payload: Record<string, unknown>;
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

export interface WalletDepositInitiatedPayload {
  walletId: string;
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

export interface UserBannedPayload {
  userId: string;
}

export interface UserSoftDeletedPayload {
  userId: string;
}

export interface ChatMessageSentPayload {
  recipientId: string;
  auctionId: string;
  auctionTitle: string;
  senderId: string;
  messageType: string;
  preview: string;
}

export interface ReviewCreatedPayload {
  reviewId: string;
  auctionId: string;
  reviewerId: string;
  reviewedUserId: string;
  type: string;
  status: string;
}

export interface ReviewPublishedPayload {
  reviewId: string;
  auctionId: string;
  reviewerId: string;
  reviewedUserId: string;
  overallRating: number;
  type: string;
}

export interface ReviewRepliedPayload {
  reviewId: string;
  auctionId: string;
  reviewerId: string;
  replierId: string;
}

export interface EscrowCreatedPayload {
  escrowId: string;
  auctionId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  currency: string;
  inspectionPeriodEndsAt: string;
}

export interface EscrowReleasedPayload {
  escrowId: string;
  auctionId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  releaseReason: string;
}

export interface EscrowRefundedPayload {
  escrowId: string;
  auctionId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  refundReason?: string;
}

export interface EscrowDisputedPayload {
  escrowId: string;
  auctionId: string;
  disputeId: string;
  openedById: string;
}

export interface DisputeOpenedPayload {
  disputeId: string;
  escrowId: string;
  auctionId: string;
  openedById: string;
  againstUserId: string;
  reason: string;
}

export interface DisputeResolvedPayload {
  disputeId: string;
  escrowId: string;
  auctionId: string;
  openedById: string;
  againstUserId: string;
  adminId: string;
  decision: string;
  adminNotes?: string;
}

export interface DisputeCancelledPayload {
  disputeId: string;
  escrowId: string;
  auctionId: string;
  openedById: string;
  againstUserId: string;
  cancelledById: string;
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
  | AccountReactivatedPayload
  | UserBannedPayload
  | WalletDepositInitiatedPayload
  | UserSoftDeletedPayload
  | ChatMessageSentPayload
  | ReviewCreatedPayload
  | ReviewPublishedPayload
  | ReviewRepliedPayload
  | AutoBidPlacedPayload
  | AutoBidExhaustedPayload
  | EscrowCreatedPayload
  | EscrowReleasedPayload
  | EscrowRefundedPayload
  | EscrowDisputedPayload
  | DisputeOpenedPayload
  | DisputeResolvedPayload
  | DisputeCancelledPayload;

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
  [RabbitMQEvent.UserBanned]: UserBannedPayload;
  [RabbitMQEvent.WalletDepositInitiated]: WalletDepositInitiatedPayload;
  [RabbitMQEvent.UserSoftDeleted]: UserSoftDeletedPayload;
  [RabbitMQEvent.ChatMessageSent]: ChatMessageSentPayload;
  [RabbitMQEvent.ReviewCreated]: ReviewCreatedPayload;
  [RabbitMQEvent.ReviewPublished]: ReviewPublishedPayload;
  [RabbitMQEvent.ReviewReplied]: ReviewRepliedPayload;
  [RabbitMQEvent.AutoBidPlaced]: AutoBidPlacedPayload;
  [RabbitMQEvent.AutoBidExhausted]: AutoBidExhaustedPayload;
  [RabbitMQEvent.EscrowCreated]: EscrowCreatedPayload;
  [RabbitMQEvent.EscrowReleased]: EscrowReleasedPayload;
  [RabbitMQEvent.EscrowRefunded]: EscrowRefundedPayload;
  [RabbitMQEvent.EscrowDisputed]: EscrowDisputedPayload;
  [RabbitMQEvent.DisputeOpened]: DisputeOpenedPayload;
  [RabbitMQEvent.DisputeResolved]: DisputeResolvedPayload;
  [RabbitMQEvent.DisputeCancelled]: DisputeCancelledPayload;
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
