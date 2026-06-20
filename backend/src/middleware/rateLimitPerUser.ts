import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types";
import { getCacheClient } from "../lib/redis";

/**
 * Per-user rate limiting using Redis.
 * Falls back to no-op if Redis is unavailable.
 */
export function rateLimitPerUser(options: {
  windowMs: number;
  max: number;
  keyPrefix: string;
  message?: string;
}) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) return next();

    try {
      const redis = getCacheClient();
      const key = `rate:${options.keyPrefix}:${userId}`;
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, Math.ceil(options.windowMs / 1000));
      }

      const ttl = await redis.ttl(key);
      const remaining = Math.max(0, options.max - current);

      res.setHeader("X-RateLimit-Limit", options.max.toString());
      res.setHeader("X-RateLimit-Remaining", remaining.toString());
      res.setHeader("X-RateLimit-Reset", (Date.now() + ttl * 1000).toString());

      if (current > options.max) {
        res.status(429).json({
          success: false,
          error: options.message || "Too many requests. Please try again later.",
        });
        return;
      }
    } catch {
      // If Redis fails, allow the request
    }

    next();
  };
}
