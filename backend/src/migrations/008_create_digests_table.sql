-- =============================================
-- Migration: 008_create_digests_table
-- Description: Create digests table for daily LLM-generated summaries
-- =============================================

CREATE TABLE IF NOT EXISTS digests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    super_chat_id UUID NOT NULL REFERENCES super_chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Digest content
    content TEXT NOT NULL,
    
    -- Summary metadata
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    message_count INTEGER DEFAULT 0,
    
    -- Delivery tracking
    sent_to JSONB DEFAULT '[]'::jsonb,
    sent_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for finding digests by super-chat
CREATE INDEX IF NOT EXISTS idx_digests_super_chat ON digests(super_chat_id, created_at DESC);

-- Index for finding digests by user
CREATE INDEX IF NOT EXISTS idx_digests_user ON digests(user_id, created_at DESC);

-- Index for finding unsent digests
CREATE INDEX IF NOT EXISTS idx_digests_unsent ON digests(sent_at) WHERE sent_at IS NULL;

COMMENT ON TABLE digests IS 'Daily LLM-generated summaries of super-chat activity';
COMMENT ON COLUMN digests.content IS 'LLM-generated summary text';
COMMENT ON COLUMN digests.sent_to IS 'JSON array of channels digest was sent to (telegram, email, slack)';
COMMENT ON COLUMN digests.period_start IS 'Start of the summarized period';
COMMENT ON COLUMN digests.period_end IS 'End of the summarized period';
