-- =============================================
-- Migration: 006_create_selected_messages_table
-- Description: Create selected_messages table for per-link message selection
-- =============================================

CREATE TABLE IF NOT EXISTS selected_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    link_id UUID NOT NULL REFERENCES context_links(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate selections
    CONSTRAINT unique_link_message UNIQUE (link_id, message_id)
);

-- Index for finding selected messages by link
CREATE INDEX IF NOT EXISTS idx_selected_messages_link ON selected_messages(link_id);

-- Index for finding links that include a specific message
CREATE INDEX IF NOT EXISTS idx_selected_messages_message ON selected_messages(message_id);

COMMENT ON TABLE selected_messages IS 'Messages specifically selected for inclusion in a context link';
COMMENT ON COLUMN selected_messages.link_id IS 'The context link this selection belongs to';
COMMENT ON COLUMN selected_messages.message_id IS 'The selected message';
