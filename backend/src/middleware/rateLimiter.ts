import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';
import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * Default rate limiter for general API requests
 */
export const rateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Слишком много запросов. Пожалуйста, подождите.',
    retryAfter: Math.ceil(env.rateLimit.windowMs / 1000)
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userId: req.userId
    });
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Слишком много запросов. Пожалуйста, подождите.',
      retryAfter: Math.ceil(env.rateLimit.windowMs / 1000)
    });
  },
  keyGenerator: (req: Request): string => {
    // Use user ID if authenticated, otherwise use IP
    return req.userId || req.ip || 'anonymous';
  },
  skip: (_req: Request): boolean => {
    // Skip rate limiting in test environment
    return env.isTest;
  }
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per minute
 */
export const authRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Слишком много попыток входа. Подождите минуту.',
    retryAfter: 60
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path
    });
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Слишком много попыток входа. Подождите минуту.',
      retryAfter: 60
    });
  },
  keyGenerator: (req: Request): string => {
    return req.ip || 'anonymous';
  },
  skip: (_req: Request): boolean => {
    return env.isTest;
  }
});

/**
 * Strict rate limiter for LLM query endpoints
 * Based on subscription plan - uses quota service instead
 * This is a fallback limit to prevent abuse
 */
export const queryRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Max 20 queries per minute regardless of plan
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Слишком много запросов к ИИ. Подождите минуту.',
    retryAfter: 60
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Query rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userId: req.userId
    });
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Слишком много запросов к ИИ. Подождите минуту.',
      retryAfter: 60
    });
  },
  keyGenerator: (req: Request): string => {
    return req.userId || req.ip || 'anonymous';
  },
  skip: (_req: Request): boolean => {
    return env.isTest;
  }
});

/**
 * Create a custom rate limiter
 * @param windowMs Time window in milliseconds
 * @param max Maximum requests in the time window
 * @param message Custom error message
 */
export function createRateLimiter(
  windowMs: number,
  max: number,
  message: string
): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too Many Requests',
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Too Many Requests',
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    },
    keyGenerator: (req: Request): string => {
      return req.userId || req.ip || 'anonymous';
    },
    skip: (_req: Request): boolean => {
      return env.isTest;
    }
  });
}

export default rateLimiter;
