import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import * as authService from '../services/auth.service';

/**
 * Register new user
 * POST /api/auth/register
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, nickname } = req.body as {
    email: string;
    password: string;
    nickname?: string;
  };

  const result = await authService.register(email, password, nickname);

  res.status(201).json({
    message: 'Регистрация успешна',
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken
  });
});

/**
 * Login user
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as {
    email: string;
    password: string;
  };

  const result = await authService.login(email, password);

  res.json({
    message: 'Вход выполнен успешно',
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken
  });
});

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken: string };

  const tokens = await authService.refreshAccessToken(refreshToken);

  res.json({
    message: 'Токен обновлён',
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken
  });
});

/**
 * Logout user
 * POST /api/auth/logout
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.split(' ')[1];

  await authService.logout(userId, accessToken);

  res.json({
    message: 'Выход выполнен успешно'
  });
});

/**
 * Get current user profile
 * GET /api/auth/me
 */
export const me = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  const user = await authService.getCurrentUser(userId);

  res.json({
    user
  });
});

/**
 * Change password
 * POST /api/auth/change-password
 */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { currentPassword, newPassword } = req.body as {
    currentPassword: string;
    newPassword: string;
  };

  await authService.changePassword(userId, currentPassword, newPassword);

  res.json({
    message: 'Пароль успешно изменён. Пожалуйста, войдите заново.'
  });
});

export default {
  register,
  login,
  refresh,
  logout,
  me,
  changePassword
};
