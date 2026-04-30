-- =============================================
-- Migration: 002_create_chats_table
-- Description: Create chats table for individual conversations
-- =============================================

CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    -- Position on the project map (for UI persistence)
    position_x FLOAT DEFAULT 0,
    position_y FLOAT DEFAULT 0
);

-- Index for user's chats
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);

-- Index for active chats
CREATE INDEX IF NOT EXISTS idx_chats_user_active ON chats(user_id, is_active) WHERE is_active = true;

-- Index for updated_at (for sorting by recent activity)
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at DESC);

-- Trigger to update updated_at
CREATE TRIGGER update_chats_updated_at
    BEFORE UPDATE ON chats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE chats IS 'Individual chat conversations';
COMMENT ON COLUMN chats.is_active IS 'Soft delete flag';
COMMENT ON COLUMN chats.position_x IS 'X position on project map canvas';
COMMENT ON COLUMN chats.position_y IS 'Y position on project map canvas';
