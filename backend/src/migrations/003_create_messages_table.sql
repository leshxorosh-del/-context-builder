-- =============================================
-- Migration: 003_create_messages_table
-- Description: Create messages table for chat messages
-- =============================================

CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role message_role NOT NULL DEFAULT 'user',
    content TEXT NOT NULL,
    token_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- For selective context inclusion (checkboxes in UI)
    is_selected BOOLEAN DEFAULT false
);

-- Index for chat messages ordered by time
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id, created_at);

-- Index for selected messages in a chat
CREATE INDEX IF NOT EXISTS idx_messages_selected ON messages(chat_id, is_selected) WHERE is_selected = true;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON messages USING gin(to_tsvector('russian', content));

COMMENT ON TABLE messages IS 'Chat messages with selective context feature';
COMMENT ON COLUMN messages.role IS 'Message sender: user, assistant, or system';
COMMENT ON COLUMN messages.token_count IS 'Approximate token count for context budgeting';
COMMENT ON COLUMN messages.is_selected IS 'Whether this message is selected for context inclusion';
