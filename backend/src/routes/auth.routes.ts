import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimiter';
import { validate, authSchemas } from '../middleware/validate';
import Joi from 'joi';

const router = Router();

/**
 * @route POST /api/auth/register
 * @desc Register new user
 * @access Public
 */
router.post(
  '/register',
  authRateLimiter,
  validate(authSchemas.register),
  authController.register
);

/**
 * @route POST /api/auth/login
 * @desc Login user
 * @access Public
 */
router.post(
  '/login',
  authRateLimiter,
  validate(authSchemas.login),
  authController.login
);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token
 * @access Public (requires valid refresh token)
 */
router.post(
  '/refresh',
  validate(authSchemas.refresh),
  authController.refresh
);

/**
 * @route POST /api/auth/logout
 * @desc Logout user
 * @access Private
 */
router.post(
  '/logout',
  authMiddleware,
  authController.logout
);

/**
 * @route GET /api/auth/me
 * @desc Get current user profile
 * @access Private
 */
router.get(
  '/me',
  authMiddleware,
  authController.me
);

/**
 * @route POST /api/auth/change-password
 * @desc Change user password
 * @access Private
 */
router.post(
  '/change-password',
  authMiddleware,
  validate(Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required()
  })),
  authController.changePassword
);

export default router;
