-- =============================================
-- Migration: 007_create_subscriptions_table
-- Description: Create subscriptions table for tariff management
-- =============================================

CREATE TYPE subscription_plan AS ENUM ('free', 'monthly', 'yearly');

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan subscription_plan NOT NULL DEFAULT 'free',
    
    -- Query quota management
    queries_remaining INTEGER NOT NULL DEFAULT 3,
    daily_queries_bonus INTEGER DEFAULT 0,
    last_bonus_date DATE,
    
    -- Subscription period
    subscribed_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    -- Payment tracking (for future payment integration)
    payment_id VARCHAR(255),
    payment_provider VARCHAR(50),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One subscription per user
    CONSTRAINT unique_user_subscription UNIQUE (user_id)
);

-- Index for expiring subscriptions (for cleanup jobs)
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON subscriptions(expires_at) WHERE expires_at IS NOT NULL;

-- Index for daily bonus processing
CREATE INDEX IF NOT EXISTS idx_subscriptions_bonus ON subscriptions(last_bonus_date, plan) WHERE plan = 'monthly';

-- Trigger to update updated_at
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE subscriptions IS 'User subscription and quota management';
COMMENT ON COLUMN subscriptions.queries_remaining IS 'Remaining smart queries (context-merged)';
COMMENT ON COLUMN subscriptions.daily_queries_bonus IS 'Bonus queries added today';
COMMENT ON COLUMN subscriptions.last_bonus_date IS 'Date of last daily bonus (for +2/day on monthly)';
