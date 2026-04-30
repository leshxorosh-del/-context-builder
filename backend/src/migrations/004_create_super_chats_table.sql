-- =============================================
-- Migration: 004_create_super_chats_table
-- Description: Create super_chats table for merged context conversations
-- =============================================

CREATE TABLE IF NOT EXISTS super_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Position on the project map (for UI persistence)
    position_x FLOAT DEFAULT 0,
    position_y FLOAT DEFAULT 0,
    
    -- Metadata
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366f1' -- Default indigo color for visual distinction
);

-- Index for user's super-chats
CREATE INDEX IF NOT EXISTS idx_super_chats_user_id ON super_chats(user_id);

-- Index for updated_at (for sorting by recent activity)
CREATE INDEX IF NOT EXISTS idx_super_chats_updated_at ON super_chats(updated_at DESC);

-- Trigger to update updated_at
CREATE TRIGGER update_super_chats_updated_at
    BEFORE UPDATE ON super_chats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE super_chats IS 'Super-chats that aggregate context from multiple sources';
COMMENT ON COLUMN super_chats.title IS 'Display title for the super-chat';
COMMENT ON COLUMN super_chats.color IS 'HEX color for visual distinction on the map';
