import { logger } from '../config/logger';
import { HttpErrors } from '../middleware/errorHandler';
import * as SubscriptionModel from '../models/Subscription.model';
import { SubscriptionPlan } from '../models/Subscription.model';

/**
 * Plan configuration
 */
export interface PlanConfig {
  name: string;
  price: number;
  priceYearly?: number;
  initialQueries: number;
  dailyBonus: number;
  maxAccumulation: number;
  features: string[];
}

/**
 * Plan limits configuration
 */
export const PLAN_CONFIGS: Record<SubscriptionPlan, PlanConfig> = {
  free: {
    name: 'Бесплатный',
    price: 0,
    initialQueries: 3,
    dailyBonus: 0,
    maxAccumulation: 3,
    features: [
      '3 умных запроса в день',
      'До 5 чатов',
      'Базовое объединение контекста',
      'Email уведомления'
    ]
  },
  monthly: {
    name: 'Месячный',
    price: 10,
    initialQueries: 50,
    dailyBonus: 2,
    maxAccumulation: 100,
    features: [
      '50 запросов + 2 в день',
      'Неограниченные чаты',
      'Полное объединение контекста',
      'Telegram + Email уведомления',
      'Ежедневные дайджесты',
      'Приоритетная поддержка'
    ]
  },
  yearly: {
    name: 'Годовой',
    price: 100,
    initialQueries: 999999,
    dailyBonus: 0,
    maxAccumulation: 999999,
    features: [
      'Безлимитные запросы',
      'Неограниченные чаты',
      'Полное объединение контекста',
      'Все каналы уведомлений',
      'Ежедневные дайджесты',
      'Приоритетная поддержка',
      'API доступ'
    ]
  }
};

/**
 * Quota check result
 */
export interface QuotaCheckResult {
  success: boolean;
  remaining: number;
  plan: SubscriptionPlan;
}

/**
 * Tariff status
 */
export interface TariffStatus {
  plan: SubscriptionPlan;
  planName: string;
  queriesRemaining: number;
  dailyBonus: number;
  maxAccumulation: number;
  nextBonusAt: Date | null;
  expiresAt: Date | null;
  features: string[];
}

/**
 * Check and decrement user quota
 */
export async function checkAndDecrementQuota(userId: string): Promise<QuotaCheckResult> {
  // Get current subscription
  let subscription = await SubscriptionModel.getSubscriptionByUser(userId);

  if (!subscription) {
    // Create default free subscription
    subscription = await SubscriptionModel.createOrUpdateSubscription(
      userId,
      'free',
      PLAN_CONFIGS.free.initialQueries
    );
  }

  // Check if monthly plan needs daily bonus
  if (subscription.plan === 'monthly') {
    const needsBonus = await SubscriptionModel.needsDailyBonus(userId);
    if (needsBonus) {
      subscription = await SubscriptionModel.addDailyBonus(
        userId,
        PLAN_CONFIGS.monthly.dailyBonus,
        PLAN_CONFIGS.monthly.maxAccumulation
      );
      logger.info('Daily bonus applied', { userId, bonus: PLAN_CONFIGS.monthly.dailyBonus });
    }
  }

  // Check if yearly plan (always has quota)
  if (subscription!.plan === 'yearly') {
    return {
      success: true,
      remaining: 999999,
      plan: 'yearly'
    };
  }

  // Try to decrement
  const updated = await SubscriptionModel.decrementQueries(userId);

  if (!updated) {
    return {
      success: false,
      remaining: 0,
      plan: subscription!.plan
    };
  }

  return {
    success: true,
    remaining: updated.queries_remaining,
    plan: updated.plan
  };
}

/**
 * Refund a quota (on error)
 */
export async function refundQuota(userId: string): Promise<void> {
  await SubscriptionModel.incrementQueries(userId, 1);
  logger.debug('Quota refunded', { userId });
}

/**
 * Get remaining quota
 */
export async function getRemainingQuota(userId: string): Promise<TariffStatus> {
  let subscription = await SubscriptionModel.getSubscriptionByUser(userId);

  if (!subscription) {
    subscription = await SubscriptionModel.createOrUpdateSubscription(
      userId,
      'free',
      PLAN_CONFIGS.free.initialQueries
    );
  }

  const planConfig = PLAN_CONFIGS[subscription.plan];
  
  // Calculate next bonus time for monthly plan
  let nextBonusAt: Date | null = null;
  if (subscription.plan === 'monthly' && subscription.last_bonus_date) {
    const lastBonus = new Date(subscription.last_bonus_date);
    nextBonusAt = new Date(lastBonus);
    nextBonusAt.setDate(nextBonusAt.getDate() + 1);
    nextBonusAt.setHours(0, 0, 0, 0);
  }

  return {
    plan: subscription.plan,
    planName: planConfig.name,
    queriesRemaining: subscription.plan === 'yearly' ? 999999 : subscription.queries_remaining,
    dailyBonus: planConfig.dailyBonus,
    maxAccumulation: planConfig.maxAccumulation,
    nextBonusAt,
    expiresAt: subscription.expires_at,
    features: planConfig.features
  };
}

/**
 * Upgrade user plan
 */
export async function upgradePlan(
  userId: string,
  newPlan: 'monthly' | 'yearly'
): Promise<TariffStatus> {
  const planConfig = PLAN_CONFIGS[newPlan];
  
  // Calculate expiration date
  const expiresAt = new Date();
  if (newPlan === 'monthly') {
    expiresAt.setMonth(expiresAt.getMonth() + 1);
  } else {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  }

  await SubscriptionModel.createOrUpdateSubscription(
    userId,
    newPlan,
    planConfig.initialQueries,
    expiresAt
  );

  logger.info('Plan upgraded', { userId, newPlan });

  return getRemainingQuota(userId);
}

/**
 * Get all available plans
 */
export function getAvailablePlans(): Array<PlanConfig & { id: SubscriptionPlan }> {
  return Object.entries(PLAN_CONFIGS).map(([id, config]) => ({
    id: id as SubscriptionPlan,
    ...config
  }));
}

/**
 * Process daily bonuses for all monthly subscribers
 * Called by cron job
 */
export async function processDailyBonuses(): Promise<number> {
  const subscribers = await SubscriptionModel.getSubscribersNeedingBonus();
  let processed = 0;

  for (const sub of subscribers) {
    try {
      await SubscriptionModel.addDailyBonus(
        sub.user_id,
        PLAN_CONFIGS.monthly.dailyBonus,
        PLAN_CONFIGS.monthly.maxAccumulation
      );
      processed++;
    } catch (error) {
      logger.error('Failed to apply daily bonus', { userId: sub.user_id, error });
    }
  }

  if (processed > 0) {
    logger.info('Daily bonuses processed', { count: processed });
  }

  return processed;
}

/**
 * Process expired subscriptions
 * Called by cron job
 */
export async function processExpiredSubscriptions(): Promise<number> {
  const expired = await SubscriptionModel.getExpiredSubscriptions();
  let processed = 0;

  for (const sub of expired) {
    try {
      await SubscriptionModel.resetToFreePlan(sub.user_id);
      processed++;
      logger.info('Subscription expired, reset to free', { userId: sub.user_id });
    } catch (error) {
      logger.error('Failed to reset expired subscription', { userId: sub.user_id, error });
    }
  }

  return processed;
}

export default {
  PLAN_CONFIGS,
  checkAndDecrementQuota,
  refundQuota,
  getRemainingQuota,
  upgradePlan,
  getAvailablePlans,
  processDailyBonuses,
  processExpiredSubscriptions
};
