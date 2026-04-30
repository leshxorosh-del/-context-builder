import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import * as tariffService from '../services/tariff.service';

/**
 * Get current tariff status
 * GET /api/tariffs/status
 */
export const getStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  const status = await tariffService.getRemainingQuota(userId);

  res.json(status);
});

/**
 * Get available plans
 * GET /api/tariffs/plans
 */
export const getPlans = asyncHandler(async (_req: Request, res: Response) => {
  const plans = tariffService.getAvailablePlans();

  res.json({
    plans
  });
});

/**
 * Upgrade plan
 * POST /api/tariffs/upgrade
 */
export const upgradePlan = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { plan } = req.body as { plan: 'monthly' | 'yearly' };

  // Note: In production, this would integrate with payment processing
  // For now, we just upgrade directly
  const status = await tariffService.upgradePlan(userId, plan);

  res.json({
    message: `Тариф обновлён до "${status.planName}"`,
    status
  });
});

export default {
  getStatus,
  getPlans,
  upgradePlan
};
