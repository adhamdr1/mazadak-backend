// Injection token for the AMQP client proxy
export const RABBITMQ_CLIENT = 'RABBITMQ_CLIENT';

// Exchange
export const MAZADAK_EXCHANGE = 'mazadak.events';

// Queues
export const NOTIFICATIONS_QUEUE = 'notifications.queue';
export const DEAD_LETTER_QUEUE = 'dead.letter.queue';

// Retry queues (TTL-based Exponential Backoff)
export const RETRY_QUEUE_5S = 'retry.queue.5s';
export const RETRY_QUEUE_30S = 'retry.queue.30s';
export const RETRY_QUEUE_2M = 'retry.queue.2m';

// Retry header key (tracks attempt count)
export const X_RETRY_COUNT = 'x-retry-count';

// Idempotency Redis key prefix (TTL: 24h)
export const IDEMPOTENCY_KEY_PREFIX = 'rabbit:msg:';
export const IDEMPOTENCY_TTL_S = 86400; // 24 hours
