import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { getRedis, RedisKeys } from '../config/redis';
import { logger } from '../config/logger';
import { HttpErrors } from './errorHandler';

/**
 * JWT payload structure
 */
export interface JwtPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Extended request with user information
 */
export interface AuthenticatedRequest extends Request {
  userId: string;
  userEmail: string;
}

/**
 * Extract JWT token from Authorization header
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Validate JWT access token
 */
async function validateToken(token: string): Promise<JwtPayload> {
  try {
    // Verify token signature and expiration
    const payload = jwt.verify(token, env.jwt.accessSecret) as JwtPayload;

    // Check if token is blacklisted
    const redis = getRedis();
    const isBlacklisted = await redis.exists(RedisKeys.tokenBlacklist(token));
    
    if (isBlacklisted) {
      throw new Error('Token is blacklisted');
    }

    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw HttpErrors.Unauthorized('Токен истёк', 'TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw HttpErrors.Unauthorized('Невалидный токен', 'INVALID_TOKEN');
    }
    throw HttpErrors.Unauthorized('Ошибка аутентификации', 'AUTH_ERROR');
  }
}

/**
 * Authentication middleware
 * Validates JWT token and adds user info to request
 */
export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (!token) {
      throw HttpErrors.Unauthorized('Требуется авторизация', 'NO_TOKEN');
    }

    const payload = await validateToken(token);

    // Add user info to request
    req.userId = payload.userId;
    (req as AuthenticatedRequest).userEmail = payload.email;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication middleware
 * Adds user info if token is present, but doesn't fail if not
 */
export async function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (token) {
      try {
        const payload = await validateToken(token);
        req.userId = payload.userId;
        (req as AuthenticatedRequest).userEmail = payload.email;
      } catch {
        // Token is invalid, but that's okay for optional auth
        logger.debug('Optional auth: invalid token provided');
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * WebSocket authentication middleware
 * Used for Socket.io handshake
 */
export async function socketAuthMiddleware(
  socket: { handshake: { auth: { token?: string } }; data: { userId?: string; email?: string } },
  next: (err?: Error) => void
): Promise<void> {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const payload = await validateToken(token);

    // Add user info to socket data
    socket.data.userId = payload.userId;
    socket.data.email = payload.email;

    next();
  } catch (error) {
    logger.warn('Socket authentication failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    next(new Error('Authentication failed'));
  }
}

/**
 * Generate JWT tokens
 */
export function generateTokens(userId: string, email: string): { accessToken: string; refreshToken: string } {
  const accessToken = jwt.sign(
    { userId, email },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiresIn }
  );

  const refreshToken = jwt.sign(
    { userId, email },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpiresIn }
  );

  return { accessToken, refreshToken };
}

/**
 * Validate refresh token
 */
export function validateRefreshToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, env.jwt.refreshSecret) as JwtPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw HttpErrors.Unauthorized('Refresh токен истёк', 'REFRESH_TOKEN_EXPIRED');
    }
    throw HttpErrors.Unauthorized('Невалидный refresh токен', 'INVALID_REFRESH_TOKEN');
  }
}

/**
 * Blacklist a token (for logout)
 */
export async function blacklistToken(token: string, expiresInSeconds: number): Promise<void> {
  const redis = getRedis();
  await redis.setex(RedisKeys.tokenBlacklist(token), expiresInSeconds, '1');
}

export default authMiddleware;
