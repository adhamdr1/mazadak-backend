// Injection token for the AMQP client proxy
export const RABBITMQ_CLIENT = 'RABBITMQ_CLIENT';

// Exchange
export const MAZADAK_EXCHANGE = 'mazadak.events';

// Queues
export const NOTIFICATIONS_QUEUE = 'notifications.queue';
export const DEAD_LETTER_QUEUE = 'dead.letter.queue';
export const PAYMENTS_WEBHOOK_QUEUE = 'payments.webhook.queue';
export const AUTH_QUEUE = 'auth.queue';
export const WALLET_QUEUE = 'wallet.queue';

// Retry header key (tracks attempt count)
export const X_RETRY_COUNT = 'x-retry-count';

// Dedicated retry queues for Wallet
export const WALLET_RETRY_QUEUE_5S = 'wallet.queue.retry.5s';

// Dedicated retry queues for Auth
export const AUTH_RETRY_QUEUE_5S = 'auth.queue.retry.5s';

// Dedicated retry queues for Webhook
export const WEBHOOK_RETRY_QUEUE_5S = 'webhook.queue.retry.5s';
export const WEBHOOK_RETRY_QUEUE_30S = 'webhook.queue.retry.30s';
export const WEBHOOK_RETRY_QUEUE_2M = 'webhook.queue.retry.2m';

// Dedicated retry queues for Notifications
export const NOTIFICATIONS_RETRY_QUEUE_5S = 'notifications.queue.retry.5s';
export const NOTIFICATIONS_RETRY_QUEUE_30S = 'notifications.queue.retry.30s';
export const NOTIFICATIONS_RETRY_QUEUE_2M = 'notifications.queue.retry.2m';
export const NOTIFICATIONS_RETRY_ROUTING_KEY = 'notification.retry.direct';

// Dedicated retry queues for Auctions
export const AUCTION_QUEUE = 'auction.queue';
export const AUCTION_RETRY_QUEUE_5S = 'auction.queue.retry.5s';
export const AUCTION_RETRY_ROUTING_KEY = 'auction.retry.direct';

// Idempotency Redis key prefix (TTL: 24h)
export const IDEMPOTENCY_KEY_PREFIX = 'rabbit:msg:';
export const IDEMPOTENCY_TTL_S = 86400; // 24 hours
