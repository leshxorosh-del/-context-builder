import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { getRedis, RedisKeys, setWithExpiry } from '../config/redis';
import { logger } from '../config/logger';
import { HttpErrors } from '../middleware/errorHandler';
import {
  IUser,
  IUserPublic,
  findUserByEmail,
  findUserById,
  emailExists,
  createUserWithSubscription,
  toPublicUser
} from '../models/User.model';

/**
 * Token pair response
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Auth response with user and tokens
 */
export interface AuthResponse {
  user: IUserPublic;
  accessToken: string;
  refreshToken: string;
}

/**
 * JWT payload
 */
interface JwtPayload {
  userId: string;
  email: string;
}

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60; // 15 minutes
const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Register a new user
 */
export async function register(
  email: string,
  password: string,
  nickname?: string
): Promise<AuthResponse> {
  // Check if email already exists
  if (await emailExists(email)) {
    throw HttpErrors.Conflict('Пользователь с таким email уже существует', 'EMAIL_EXISTS');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Create user with subscription
  const user = await createUserWithSubscription({
    email: email.toLowerCase(),
    password_hash: passwordHash,
    nickname
  });

  logger.info('User registered', { userId: user.id, email: user.email });

  // Generate tokens
  const tokens = await generateAndStoreTokens(user.id, user.email);

  return {
    user: toPublicUser(user),
    ...tokens
  };
}

/**
 * Login user
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  // Find user
  const user = await findUserByEmail(email.toLowerCase());
  
  if (!user) {
    throw HttpErrors.Unauthorized('Неверный email или пароль', 'INVALID_CREDENTIALS');
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  
  if (!isValidPassword) {
    logger.warn('Failed login attempt', { email });
    throw HttpErrors.Unauthorized('Неверный email или пароль', 'INVALID_CREDENTIALS');
  }

  logger.info('User logged in', { userId: user.id, email: user.email });

  // Generate tokens
  const tokens = await generateAndStoreTokens(user.id, user.email);

  return {
    user: toPublicUser(user),
    ...tokens
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenPair> {
  // Verify refresh token
  let payload: JwtPayload;
  
  try {
    payload = jwt.verify(refreshToken, env.jwt.refreshSecret) as JwtPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw HttpErrors.Unauthorized('Refresh токен истёк', 'REFRESH_TOKEN_EXPIRED');
    }
    throw HttpErrors.Unauthorized('Невалидный refresh токен', 'INVALID_REFRESH_TOKEN');
  }

  // Check if refresh token is stored in Redis
  const redis = getRedis();
  const storedToken = await redis.get(RedisKeys.refreshToken(payload.userId));
  
  if (!storedToken || storedToken !== refreshToken) {
    throw HttpErrors.Unauthorized('Refresh токен недействителен', 'INVALID_REFRESH_TOKEN');
  }

  // Verify user still exists
  const user = await findUserById(payload.userId);
  
  if (!user) {
    throw HttpErrors.Unauthorized('Пользователь не найден', 'USER_NOT_FOUND');
  }

  // Generate new tokens
  return generateAndStoreTokens(user.id, user.email);
}

/**
 * Logout user (invalidate tokens)
 */
export async function logout(userId: string, accessToken?: string): Promise<void> {
  const redis = getRedis();

  // Remove refresh token
  await redis.del(RedisKeys.refreshToken(userId));

  // Blacklist access token if provided
  if (accessToken) {
    await setWithExpiry(
      RedisKeys.tokenBlacklist(accessToken),
      '1',
      ACCESS_TOKEN_EXPIRY_SECONDS
    );
  }

  logger.info('User logged out', { userId });
}

/**
 * Validate access token
 */
export async function validateAccessToken(token: string): Promise<JwtPayload> {
  // Check blacklist
  const redis = getRedis();
  const isBlacklisted = await redis.exists(RedisKeys.tokenBlacklist(token));
  
  if (isBlacklisted) {
    throw HttpErrors.Unauthorized('Токен недействителен', 'TOKEN_BLACKLISTED');
  }

  // Verify token
  try {
    return jwt.verify(token, env.jwt.accessSecret) as JwtPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw HttpErrors.Unauthorized('Токен истёк', 'TOKEN_EXPIRED');
    }
    throw HttpErrors.Unauthorized('Невалидный токен', 'INVALID_TOKEN');
  }
}

/**
 * Get current user profile
 */
export async function getCurrentUser(userId: string): Promise<IUserPublic> {
  const user = await findUserById(userId);
  
  if (!user) {
    throw HttpErrors.NotFound('Пользователь не найден', 'USER_NOT_FOUND');
  }

  return toPublicUser(user);
}

/**
 * Generate access and refresh tokens
 */
function generateTokens(userId: string, email: string): TokenPair {
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
 * Generate tokens and store refresh token in Redis
 */
async function generateAndStoreTokens(userId: string, email: string): Promise<TokenPair> {
  const tokens = generateTokens(userId, email);

  // Store refresh token in Redis
  await setWithExpiry(
    RedisKeys.refreshToken(userId),
    tokens.refreshToken,
    REFRESH_TOKEN_EXPIRY_SECONDS
  );

  return tokens;
}

/**
 * Change user password
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await findUserById(userId);
  
  if (!user) {
    throw HttpErrors.NotFound('Пользователь не найден', 'USER_NOT_FOUND');
  }

  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
  
  if (!isValidPassword) {
    throw HttpErrors.BadRequest('Неверный текущий пароль', 'INVALID_PASSWORD');
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // Update password in database
  const { query } = await import('../config/database');
  await query(
    'UPDATE users SET password_hash = $1 WHERE id = $2',
    [newPasswordHash, userId]
  );

  // Invalidate all sessions
  await logout(userId);

  logger.info('Password changed', { userId });
}

export default {
  register,
  login,
  refreshAccessToken,
  logout,
  validateAccessToken,
  getCurrentUser,
  changePassword
};
