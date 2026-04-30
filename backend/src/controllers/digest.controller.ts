import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import * as digestService from '../services/digest.service';
import * as notificationService from '../services/notification.service';

/**
 * Get latest digest for a super-chat
 * GET /api/super-chats/:id/digest/latest
 */
export const getLatestDigest = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;

  const digest = await digestService.getLatestDigest(id, userId);

  res.json({
    digest
  });
});

/**
 * Get digest history
 * GET /api/super-chats/:id/digest/history
 */
export const getDigestHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;
  const { limit } = req.query;

  const digests = await digestService.getDigestHistory(
    id,
    userId,
    limit ? parseInt(limit as string, 10) : 10
  );

  res.json({
    digests,
    count: digests.length
  });
});

/**
 * Generate and send digest
 * POST /api/super-chats/:id/digest/send
 */
export const generateAndSendDigest = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;

  // Generate digest
  const digest = await digestService.generateAndStoreDigest(id, userId);

  // Send to configured channels
  const sentTo = await notificationService.sendDigestToConfigured(userId, digest);

  res.json({
    message: 'Дайджест создан и отправлен',
    digest,
    sentTo
  });
});

export default {
  getLatestDigest,
  getDigestHistory,
  generateAndSendDigest
};
