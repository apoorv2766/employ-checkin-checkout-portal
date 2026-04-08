import Redis from 'ioredis';

const REDIS_URL = process.env['REDIS_URL'];

if (!REDIS_URL) {
  throw new Error('REDIS_URL environment variable is not set');
}

const redis = new Redis(REDIS_URL, {
  // Retry with exponential back-off, give up after 3 attempts
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});

redis.on('connect', () => {
  console.log('[redis] Connected');
});

redis.on('error', (err: unknown) => {
  console.error('[redis] Error:', err);
});

redis.on('close', () => {
  console.warn('[redis] Connection closed');
});

export default redis;

// ─── Key helpers ──────────────────────────────────────────────────────────────
// Centralised key builders avoid typos and make key patterns auditable.

/** Refresh token family: `refresh:<userId>:<tokenId>` */
export const refreshKey = (userId: string, tokenId: string): string =>
  `refresh:${userId}:${tokenId}`;

/** All refresh tokens for a user — used for wildcard invalidation on replay attack */
export const refreshKeyPattern = (userId: string): string => `refresh:${userId}:*`;

/** Login brute-force counter: `login:<email>` */
export const loginLockKey = (email: string): string => `login:${email}`;

/** Check-in idempotency: `checkin:<userId>:<YYYY-MM-DD>` */
export const checkInKey = (userId: string, date: string): string => `checkin:${userId}:${date}`;

/** Report generation lock: `report:generating:<jobId>` */
export const reportGeneratingKey = (jobId: string): string => `report:generating:${jobId}`;
