-- =============================================
-- Migration: 009_create_notification_configs_table
-- Description: Create notification_configs table for user notification preferences
-- =============================================

CREATE TABLE IF NOT EXISTS notification_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Channel configurations
    telegram_chat_id VARCHAR(100),
    telegram_verified BOOLEAN DEFAULT false,
    email VARCHAR(255),
    email_verified BOOLEAN DEFAULT false,
    slack_webhook VARCHAR(500),
    slack_verified BOOLEAN DEFAULT false,
    
    -- Schedule settings
    schedule JSONB DEFAULT '{
        "enabled": false,
        "time": "09:00",
        "days": [1, 2, 3, 4, 5],
        "timezone": "Europe/Moscow"
    }'::jsonb,
    
    -- Trigger settings
    triggers JSONB DEFAULT '{
        "onNewLink": false,
        "onDigest": true,
        "onQuotaLow": true
    }'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One config per user
    CONSTRAINT unique_user_notification_config UNIQUE (user_id)
);

-- Index for scheduled notification processing
CREATE INDEX IF NOT EXISTS idx_notification_configs_schedule ON notification_configs((schedule->>'enabled'), (schedule->>'time')) 
    WHERE (schedule->>'enabled')::boolean = true;

-- Trigger to update updated_at
CREATE TRIGGER update_notification_configs_updated_at
    BEFORE UPDATE ON notification_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE notification_configs IS 'User notification channel and schedule preferences';
COMMENT ON COLUMN notification_configs.telegram_chat_id IS 'Telegram chat ID for bot notifications';
COMMENT ON COLUMN notification_configs.schedule IS 'JSON schedule config: enabled, time, days, timezone';
COMMENT ON COLUMN notification_configs.triggers IS 'JSON trigger config: which events trigger notifications';
