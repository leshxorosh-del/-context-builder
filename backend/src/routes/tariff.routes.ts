import { Router } from 'express';
import * as tariffController from '../controllers/tariff.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate, tariffSchemas } from '../middleware/validate';

const router = Router();

/**
 * @route GET /api/tariffs/plans
 * @desc Get available plans
 * @access Public
 */
router.get('/plans', tariffController.getPlans);

// Protected routes
router.use(authMiddleware);

/**
 * @route GET /api/tariffs/status
 * @desc Get current tariff status
 * @access Private
 */
router.get('/status', tariffController.getStatus);

/**
 * @route POST /api/tariffs/upgrade
 * @desc Upgrade subscription plan
 * @access Private
 */
router.post(
  '/upgrade',
  validate(tariffSchemas.upgrade),
  tariffController.upgradePlan
);

export default router;
