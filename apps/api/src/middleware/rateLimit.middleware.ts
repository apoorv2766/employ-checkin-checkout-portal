import type { Request, Response, NextFunction } from 'express';
import redis from '../lib/redis';
import { sendError } from '../utils/response';
import { ErrorCode } from '../utils/AppError';

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 100;

/**
 * Redis-backed IP rate limiter: 100 requests per minute per IP.
 * Applied globally (see index.ts).
 */
export async function apiRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // req.ip respects `trust proxy` setting
  const ip = req.ip ?? 'unknown';
  const key = `rateLimit:ip:${ip}`;

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      // Start the window on the first request
      await redis.expire(key, WINDOW_SECONDS);
    }

    res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - count));

    if (count > MAX_REQUESTS) {
      const ttl = await redis.ttl(key);
      res.setHeader('Retry-After', ttl);
      sendError(
        res,
        ErrorCode.RATE_LIMIT_EXCEEDED,
        'Too many requests. Please slow down.',
        429,
      );
      return;
    }
  } catch {
    // If Redis is unavailable, fail open (don't block traffic)
  }

  next();
}
