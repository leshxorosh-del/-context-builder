-- =============================================
-- Migration: 010_create_super_chat_messages_table
-- Description: Create table for messages within super-chats
-- =============================================

CREATE TABLE IF NOT EXISTS super_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    super_chat_id UUID NOT NULL REFERENCES super_chats(id) ON DELETE CASCADE,
    role message_role NOT NULL DEFAULT 'user',
    content TEXT NOT NULL,
    token_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Track which sources were used for this response
    context_sources JSONB DEFAULT '[]'::jsonb
);

-- Index for super-chat messages ordered by time
CREATE INDEX IF NOT EXISTS idx_super_chat_messages_chat ON super_chat_messages(super_chat_id, created_at);

COMMENT ON TABLE super_chat_messages IS 'Messages in super-chat conversations';
COMMENT ON COLUMN super_chat_messages.context_sources IS 'JSON array of source chat IDs used for context';
