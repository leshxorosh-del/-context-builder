import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

/**
 * Redis client instance
 */
let redis: Redis | null = null;

/**
 * Initialize Redis connection
 */
export async function initializeRedis(): Promise<void> {
  if (redis) {
    logger.warn('Redis client already initialized');
    return;
  }

  redis = new Redis({
    host: env.redis.host,
    port: env.redis.port,
    password: env.redis.password || undefined,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 3) {
        logger.error('Redis connection failed after 3 retries');
        return null;
      }
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true
  });

  redis.on('connect', () => {
    logger.info('Redis connected successfully', {
      host: env.redis.host,
      port: env.redis.port
    });
  });

  redis.on('error', (error) => {
    logger.error('Redis error', { error: error.message });
  });

  redis.on('close', () => {
    logger.warn('Redis connection closed');
  });

  try {
    await redis.connect();
    await redis.ping();
  } catch (error) {
    logger.error('Failed to connect to Redis', { error });
    throw error;
  }
}

/**
 * Get Redis client instance
 */
export function getRedis(): Redis {
  if (!redis) {
    throw new Error('Redis client not initialized. Call initializeRedis() first.');
  }
  return redis;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info('Redis connection closed');
  }
}

/**
 * Check Redis health
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const result = await getRedis().ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}

// ============================================
// Redis Key Patterns
// ============================================

/**
 * Key prefixes for different data types
 */
export const RedisKeys = {
  /** Refresh token storage */
  refreshToken: (userId: string): string => `auth:refresh:${userId}`,
  
  /** Token blacklist */
  tokenBlacklist: (token: string): string => `auth:blacklist:${token}`,
  
  /** User session */
  userSession: (userId: string): string => `session:${userId}`,
  
  /** Rate limit */
  rateLimit: (key: string): string => `rate:${key}`,
  
  /** Cache for context */
  contextCache: (superChatId: string): string => `cache:context:${superChatId}`,
  
  /** Socket connection */
  socketConnection: (userId: string): string => `socket:${userId}`,
  
  /** Daily quota tracking */
  dailyQuota: (userId: string, date: string): string => `quota:${userId}:${date}`
} as const;

// ============================================
// Redis Helper Functions
// ============================================

/**
 * Set a value with optional expiration
 */
export async function setWithExpiry(
  key: string,
  value: string | object,
  expirySeconds: number
): Promise<void> {
  const redis = getRedis();
  const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;
  await redis.setex(key, expirySeconds, stringValue);
}

/**
 * Get and parse a JSON value
 */
export async function getJson<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  const value = await redis.get(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * Delete keys matching a pattern
 */
export async function deleteByPattern(pattern: string): Promise<number> {
  const redis = getRedis();
  const keys = await redis.keys(pattern);
  if (keys.length === 0) return 0;
  return redis.del(...keys);
}

/**
 * Increment a counter with expiry
 */
export async function incrementWithExpiry(
  key: string,
  expirySeconds: number
): Promise<number> {
  const redis = getRedis();
  const multi = redis.multi();
  multi.incr(key);
  multi.expire(key, expirySeconds);
  const results = await multi.exec();
  return results?.[0]?.[1] as number || 0;
}

export default {
  initializeRedis,
  getRedis,
  closeRedis,
  checkRedisHealth,
  RedisKeys,
  setWithExpiry,
  getJson,
  deleteByPattern,
  incrementWithExpiry
};
