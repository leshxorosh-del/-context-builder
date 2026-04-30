/**
 * Tariff Service Tests
 */

jest.mock('../../config/database', () => ({
  query: jest.fn()
}));

jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

import { query } from '../../config/database';
import * as tariffService from '../tariff.service';

describe('Tariff Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PLAN_CONFIGS', () => {
    it('should have correct free plan limits', () => {
      const freePlan = tariffService.PLAN_CONFIGS.free;
      
      expect(freePlan.initialQueries).toBe(3);
      expect(freePlan.dailyBonus).toBe(0);
      expect(freePlan.maxAccumulation).toBe(3);
    });

    it('should have correct monthly plan limits', () => {
      const monthlyPlan = tariffService.PLAN_CONFIGS.monthly;
      
      expect(monthlyPlan.initialQueries).toBe(50);
      expect(monthlyPlan.dailyBonus).toBe(2);
      expect(monthlyPlan.maxAccumulation).toBe(100);
    });

    it('should have correct yearly plan limits', () => {
      const yearlyPlan = tariffService.PLAN_CONFIGS.yearly;
      
      expect(yearlyPlan.initialQueries).toBe(999999);
      expect(yearlyPlan.dailyBonus).toBe(0);
    });
  });

  describe('checkAndDecrementQuota', () => {
    it('should decrement quota for free user', async () => {
      const mockSubscription = {
        id: 'sub-1',
        user_id: 'user-1',
        plan: 'free',
        queries_remaining: 3,
        last_bonus_date: null
      };

      // Get subscription
      (query as jest.Mock).mockResolvedValueOnce({ rows: [mockSubscription] });
      // needsDailyBonus - not applicable for free
      // Decrement queries
      (query as jest.Mock).mockResolvedValueOnce({ 
        rows: [{ ...mockSubscription, queries_remaining: 2 }] 
      });

      const result = await tariffService.checkAndDecrementQuota('user-1');

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(2);
      expect(result.plan).toBe('free');
    });

    it('should return false when quota is exhausted', async () => {
      const mockSubscription = {
        id: 'sub-1',
        user_id: 'user-1',
        plan: 'free',
        queries_remaining: 0,
        last_bonus_date: null
      };

      (query as jest.Mock).mockResolvedValueOnce({ rows: [mockSubscription] });
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // Decrement fails

      const result = await tariffService.checkAndDecrementQuota('user-1');

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should always succeed for yearly plan', async () => {
      const mockSubscription = {
        id: 'sub-1',
        user_id: 'user-1',
        plan: 'yearly',
        queries_remaining: 999999
      };

      (query as jest.Mock).mockResolvedValueOnce({ rows: [mockSubscription] });

      const result = await tariffService.checkAndDecrementQuota('user-1');

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(999999);
      expect(result.plan).toBe('yearly');
    });

    it('should create default subscription if none exists', async () => {
      // No subscription found
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      
      // Create subscription
      const newSub = {
        id: 'sub-new',
        user_id: 'user-1',
        plan: 'free',
        queries_remaining: 3
      };
      (query as jest.Mock).mockResolvedValueOnce({ rows: [newSub] });
      
      // Decrement
      (query as jest.Mock).mockResolvedValueOnce({ 
        rows: [{ ...newSub, queries_remaining: 2 }] 
      });

      const result = await tariffService.checkAndDecrementQuota('user-1');

      expect(result.success).toBe(true);
    });
  });

  describe('getAvailablePlans', () => {
    it('should return all three plans', () => {
      const plans = tariffService.getAvailablePlans();

      expect(plans).toHaveLength(3);
      expect(plans.map(p => p.id)).toContain('free');
      expect(plans.map(p => p.id)).toContain('monthly');
      expect(plans.map(p => p.id)).toContain('yearly');
    });

    it('should include features for each plan', () => {
      const plans = tariffService.getAvailablePlans();

      plans.forEach(plan => {
        expect(plan.features).toBeDefined();
        expect(plan.features.length).toBeGreaterThan(0);
      });
    });
  });
});
