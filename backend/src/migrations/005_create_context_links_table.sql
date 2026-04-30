-- =============================================
-- Migration: 005_create_context_links_table
-- Description: Create context_links table for graph edges between chats and super-chats
-- =============================================

CREATE TYPE link_type AS ENUM ('chat', 'super_chat');

CREATE TABLE IF NOT EXISTS context_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    super_chat_id UUID NOT NULL REFERENCES super_chats(id) ON DELETE CASCADE,
    
    -- Source can be either a chat or another super-chat
    source_chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    source_super_chat_id UUID REFERENCES super_chats(id) ON DELETE CASCADE,
    
    link_type link_type NOT NULL DEFAULT 'chat',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure source is set based on link_type
    CONSTRAINT check_source_type CHECK (
        (link_type = 'chat' AND source_chat_id IS NOT NULL AND source_super_chat_id IS NULL) OR
        (link_type = 'super_chat' AND source_super_chat_id IS NOT NULL AND source_chat_id IS NULL)
    ),
    
    -- Prevent duplicate links
    CONSTRAINT unique_chat_link UNIQUE (super_chat_id, source_chat_id),
    CONSTRAINT unique_super_chat_link UNIQUE (super_chat_id, source_super_chat_id),
    
    -- Prevent self-referencing super-chats
    CONSTRAINT no_self_reference CHECK (super_chat_id != source_super_chat_id)
);

-- Index for finding all links to a super-chat
CREATE INDEX IF NOT EXISTS idx_context_links_super_chat ON context_links(super_chat_id);

-- Index for finding links from a specific chat
CREATE INDEX IF NOT EXISTS idx_context_links_source_chat ON context_links(source_chat_id) WHERE source_chat_id IS NOT NULL;

-- Index for finding links from a specific super-chat
CREATE INDEX IF NOT EXISTS idx_context_links_source_super ON context_links(source_super_chat_id) WHERE source_super_chat_id IS NOT NULL;

COMMENT ON TABLE context_links IS 'Edges connecting sources (chats/super-chats) to super-chats';
COMMENT ON COLUMN context_links.link_type IS 'Type of source: chat or super_chat';
COMMENT ON COLUMN context_links.source_chat_id IS 'Source chat (if link_type = chat)';
COMMENT ON COLUMN context_links.source_super_chat_id IS 'Source super-chat (if link_type = super_chat)';
