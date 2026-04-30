import { Router } from 'express';
import * as digestController from '../controllers/digest.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate, idParamSchema } from '../middleware/validate';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route GET /api/digests/:id/latest
 * @desc Get latest digest for a super-chat
 * @access Private
 */
router.get(
  '/:id/latest',
  validate(idParamSchema, 'params'),
  digestController.getLatestDigest
);

/**
 * @route GET /api/digests/:id/history
 * @desc Get digest history for a super-chat
 * @access Private
 */
router.get(
  '/:id/history',
  validate(idParamSchema, 'params'),
  digestController.getDigestHistory
);

/**
 * @route POST /api/digests/:id/send
 * @desc Generate and send digest for a super-chat
 * @access Private
 */
router.post(
  '/:id/send',
  validate(idParamSchema, 'params'),
  digestController.generateAndSendDigest
);

export default router;
