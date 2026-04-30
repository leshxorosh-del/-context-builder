/**
 * Auth Service Tests
 */

import bcrypt from 'bcrypt';

// Mock dependencies
jest.mock('../../config/database', () => ({
  query: jest.fn(),
  withTransaction: jest.fn((fn) => fn({
    query: jest.fn()
  }))
}));

jest.mock('../../config/redis', () => ({
  getRedis: jest.fn(() => ({
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    exists: jest.fn().mockResolvedValue(0)
  })),
  RedisKeys: {
    refreshToken: (id: string) => `auth:refresh:${id}`,
    tokenBlacklist: (token: string) => `auth:blacklist:${token}`
  },
  setWithExpiry: jest.fn()
}));

jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

import { query, withTransaction } from '../../config/database';
import * as authService from '../auth.service';

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should create a new user with hashed password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed',
        nickname: 'Test User',
        created_at: new Date()
      };

      // Mock emailExists to return false
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      
      // Mock withTransaction
      (withTransaction as jest.Mock).mockImplementation(async (fn) => {
        const client = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [mockUser] }) // createUser
            .mockResolvedValueOnce({ rows: [] }) // create subscription
            .mockResolvedValueOnce({ rows: [] }) // create notification config
        };
        return fn(client);
      });

      const result = await authService.register('test@example.com', 'password123', 'Test User');

      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw error if email already exists', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 'existing' }] });

      await expect(
        authService.register('existing@example.com', 'password123')
      ).rejects.toThrow('Пользователь с таким email уже существует');
    });
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 12);
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: hashedPassword,
        nickname: 'Test',
        created_at: new Date()
      };

      (query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      const result = await authService.login('test@example.com', 'password123');

      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw error for invalid email', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(
        authService.login('nonexistent@example.com', 'password123')
      ).rejects.toThrow('Неверный email или пароль');
    });

    it('should throw error for invalid password', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 12);
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: hashedPassword
      };

      (query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      await expect(
        authService.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Неверный email или пароль');
    });
  });

  describe('validateAccessToken', () => {
    it('should reject blacklisted tokens', async () => {
      const { getRedis } = require('../../config/redis');
      getRedis.mockReturnValue({
        exists: jest.fn().mockResolvedValue(1) // Token is blacklisted
      });

      await expect(
        authService.validateAccessToken('blacklisted-token')
      ).rejects.toThrow('Токен недействителен');
    });
  });
});
