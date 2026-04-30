import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate, notificationSchemas } from '../middleware/validate';
import Joi from 'joi';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route GET /api/notifications/config
 * @desc Get notification config for current user
 * @access Private
 */
router.get('/config', notificationController.getConfig);

/**
 * @route PUT /api/notifications/config
 * @desc Update notification config
 * @access Private
 */
router.put(
  '/config',
  validate(notificationSchemas.updateConfig),
  notificationController.updateConfig
);

/**
 * @route POST /api/notifications/test
 * @desc Send test notification
 * @access Private
 */
router.post(
  '/test',
  validate(Joi.object({
    channel: Joi.string().valid('telegram', 'email', 'slack').required()
  })),
  notificationController.testNotification
);

export default router;
