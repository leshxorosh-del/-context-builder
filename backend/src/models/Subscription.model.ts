import { query } from '../config/database';

/**
 * Subscription plan type
 */
export type SubscriptionPlan = 'free' | 'monthly' | 'yearly';

/**
 * Subscription interface
 */
export interface ISubscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  queries_remaining: number;
  daily_queries_bonus: number;
  last_bonus_date: Date | null;
  subscribed_at: Date;
  expires_at: Date | null;
  payment_id: string | null;
  payment_provider: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Get subscription by user ID
 */
export async function getSubscriptionByUser(userId: string): Promise<ISubscription | null> {
  const result = await query<ISubscription>(
    'SELECT * FROM subscriptions WHERE user_id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Create or update subscription
 */
export async function createOrUpdateSubscription(
  userId: string,
  plan: SubscriptionPlan,
  queriesRemaining: number,
  expiresAt?: Date
): Promise<ISubscription> {
  const result = await query<ISubscription>(`
    INSERT INTO subscriptions (user_id, plan, queries_remaining, expires_at, subscribed_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      plan = $2,
      queries_remaining = $3,
      expires_at = $4,
      subscribed_at = NOW(),
      updated_at = NOW()
    RETURNING *
  `, [userId, plan, queriesRemaining, expiresAt || null]);

  return result.rows[0];
}

/**
 * Decrement queries remaining
 * Returns the updated subscription or null if no queries left
 */
export async function decrementQueries(userId: string): Promise<ISubscription | null> {
  const result = await query<ISubscription>(`
    UPDATE subscriptions
    SET queries_remaining = queries_remaining - 1,
        updated_at = NOW()
    WHERE user_id = $1 AND queries_remaining > 0
    RETURNING *
  `, [userId]);

  return result.rows[0] || null;
}

/**
 * Increment queries (refund)
 */
export async function incrementQueries(userId: string, amount: number = 1): Promise<ISubscription | null> {
  const result = await query<ISubscription>(`
    UPDATE subscriptions
    SET queries_remaining = queries_remaining + $2,
        updated_at = NOW()
    WHERE user_id = $1
    RETURNING *
  `, [userId, amount]);

  return result.rows[0] || null;
}

/**
 * Add daily bonus queries
 */
export async function addDailyBonus(
  userId: string,
  bonusAmount: number,
  maxAccumulation: number
): Promise<ISubscription | null> {
  const result = await query<ISubscription>(`
    UPDATE subscriptions
    SET 
      queries_remaining = LEAST(queries_remaining + $2, $3),
      daily_queries_bonus = $2,
      last_bonus_date = CURRENT_DATE,
      updated_at = NOW()
    WHERE user_id = $1
    RETURNING *
  `, [userId, bonusAmount, maxAccumulation]);

  return result.rows[0] || null;
}

/**
 * Check if daily bonus is needed
 */
export async function needsDailyBonus(userId: string): Promise<boolean> {
  const result = await query<{ needs_bonus: boolean }>(`
    SELECT 
      (last_bonus_date IS NULL OR last_bonus_date < CURRENT_DATE) as needs_bonus
    FROM subscriptions
    WHERE user_id = $1 AND plan = 'monthly'
  `, [userId]);

  return result.rows[0]?.needs_bonus ?? false;
}

/**
 * Get all monthly subscribers who need daily bonus
 */
export async function getSubscribersNeedingBonus(): Promise<ISubscription[]> {
  const result = await query<ISubscription>(`
    SELECT * FROM subscriptions
    WHERE plan = 'monthly'
      AND (last_bonus_date IS NULL OR last_bonus_date < CURRENT_DATE)
      AND (expires_at IS NULL OR expires_at > NOW())
  `);

  return result.rows;
}

/**
 * Get expired subscriptions
 */
export async function getExpiredSubscriptions(): Promise<ISubscription[]> {
  const result = await query<ISubscription>(`
    SELECT * FROM subscriptions
    WHERE expires_at IS NOT NULL 
      AND expires_at < NOW()
      AND plan != 'free'
  `);

  return result.rows;
}

/**
 * Reset subscription to free plan
 */
export async function resetToFreePlan(userId: string): Promise<ISubscription | null> {
  const result = await query<ISubscription>(`
    UPDATE subscriptions
    SET 
      plan = 'free',
      queries_remaining = 3,
      daily_queries_bonus = 0,
      expires_at = NULL,
      updated_at = NOW()
    WHERE user_id = $1
    RETURNING *
  `, [userId]);

  return result.rows[0] || null;
}

/**
 * Get subscription statistics
 */
export async function getSubscriptionStats(): Promise<{
  total: number;
  free: number;
  monthly: number;
  yearly: number;
}> {
  const result = await query<{ plan: SubscriptionPlan; count: string }>(`
    SELECT plan, COUNT(*) as count
    FROM subscriptions
    GROUP BY plan
  `);

  const stats = { total: 0, free: 0, monthly: 0, yearly: 0 };
  
  for (const row of result.rows) {
    const count = parseInt(row.count, 10);
    stats[row.plan] = count;
    stats.total += count;
  }

  return stats;
}

export default {
  getSubscriptionByUser,
  createOrUpdateSubscription,
  decrementQueries,
  incrementQueries,
  addDailyBonus,
  needsDailyBonus,
  getSubscribersNeedingBonus,
  getExpiredSubscriptions,
  resetToFreePlan,
  getSubscriptionStats
};
