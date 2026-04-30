import { query, withTransaction } from '../config/database';
import { runQuery, NodeLabels, RelationshipTypes } from '../config/neo4j';
import { PoolClient } from 'pg';

/**
 * Super-chat interface
 */
export interface ISuperChat {
  id: string;
  user_id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
  position_x: number;
  position_y: number;
  description: string | null;
  color: string;
}

/**
 * Super-chat with stats
 */
export interface ISuperChatWithStats extends ISuperChat {
  source_count: number;
  message_count: number;
}

/**
 * Context link interface
 */
export interface IContextLink {
  id: string;
  super_chat_id: string;
  source_chat_id: string | null;
  source_super_chat_id: string | null;
  link_type: 'chat' | 'super_chat';
  created_at: Date;
}

/**
 * Context link with details
 */
export interface IContextLinkWithDetails extends IContextLink {
  source_title: string;
  selected_message_count: number;
  total_message_count: number;
}

/**
 * Selected message for context link
 */
export interface ISelectedMessage {
  id: string;
  link_id: string;
  message_id: string;
  created_at: Date;
}

/**
 * Super-chat message interface
 */
export interface ISuperChatMessage {
  id: string;
  super_chat_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  token_count: number;
  created_at: Date;
  context_sources: string[];
}

// ============================================
// Super-Chat CRUD
// ============================================

/**
 * Create a new super-chat
 */
export async function createSuperChat(
  userId: string,
  title: string,
  options?: { position_x?: number; position_y?: number; color?: string }
): Promise<ISuperChat> {
  return withTransaction(async (client) => {
    // Create in PostgreSQL
    const result = await client.query<ISuperChat>(`
      INSERT INTO super_chats (user_id, title, position_x, position_y, color)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      userId,
      title,
      options?.position_x ?? 0,
      options?.position_y ?? 0,
      options?.color ?? '#8B5CF6'
    ]);

    const superChat = result.rows[0];

    // Create node in Neo4j
    await runQuery(`
      CREATE (sc:${NodeLabels.SUPER_CHAT} {
        id: $id,
        userId: $userId,
        title: $title
      })
    `, {
      id: superChat.id,
      userId,
      title
    });

    return superChat;
  });
}

/**
 * Get super-chats by user
 */
export async function getSuperChatsByUser(userId: string): Promise<ISuperChatWithStats[]> {
  const result = await query<ISuperChatWithStats>(`
    SELECT 
      sc.*,
      COUNT(DISTINCT cl.id)::integer as source_count,
      COUNT(DISTINCT scm.id)::integer as message_count
    FROM super_chats sc
    LEFT JOIN context_links cl ON cl.super_chat_id = sc.id
    LEFT JOIN super_chat_messages scm ON scm.super_chat_id = sc.id
    WHERE sc.user_id = $1
    GROUP BY sc.id
    ORDER BY sc.updated_at DESC
  `, [userId]);

  return result.rows;
}

/**
 * Get super-chat by ID
 */
export async function getSuperChatById(superChatId: string): Promise<ISuperChat | null> {
  const result = await query<ISuperChat>(
    'SELECT * FROM super_chats WHERE id = $1',
    [superChatId]
  );
  return result.rows[0] || null;
}

/**
 * Get super-chat with stats
 */
export async function getSuperChatWithStats(superChatId: string): Promise<ISuperChatWithStats | null> {
  const result = await query<ISuperChatWithStats>(`
    SELECT 
      sc.*,
      COUNT(DISTINCT cl.id)::integer as source_count,
      COUNT(DISTINCT scm.id)::integer as message_count
    FROM super_chats sc
    LEFT JOIN context_links cl ON cl.super_chat_id = sc.id
    LEFT JOIN super_chat_messages scm ON scm.super_chat_id = sc.id
    WHERE sc.id = $1
    GROUP BY sc.id
  `, [superChatId]);

  return result.rows[0] || null;
}

/**
 * Update super-chat
 */
export async function updateSuperChat(
  superChatId: string,
  data: Partial<Pick<ISuperChat, 'title' | 'position_x' | 'position_y' | 'description' | 'color'>>
): Promise<ISuperChat | null> {
  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (data.title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    params.push(data.title);
  }
  if (data.position_x !== undefined) {
    updates.push(`position_x = $${paramIndex++}`);
    params.push(data.position_x);
  }
  if (data.position_y !== undefined) {
    updates.push(`position_y = $${paramIndex++}`);
    params.push(data.position_y);
  }
  if (data.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    params.push(data.description);
  }
  if (data.color !== undefined) {
    updates.push(`color = $${paramIndex++}`);
    params.push(data.color);
  }

  if (updates.length === 0) {
    return getSuperChatById(superChatId);
  }

  params.push(superChatId);

  const result = await query<ISuperChat>(`
    UPDATE super_chats 
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `, params);

  return result.rows[0] || null;
}

/**
 * Delete super-chat
 */
export async function deleteSuperChat(superChatId: string): Promise<boolean> {
  return withTransaction(async (client) => {
    // Delete from PostgreSQL (cascades to context_links)
    const result = await client.query(
      'DELETE FROM super_chats WHERE id = $1',
      [superChatId]
    );

    // Delete from Neo4j
    await runQuery(`
      MATCH (sc:${NodeLabels.SUPER_CHAT} {id: $id})
      DETACH DELETE sc
    `, { id: superChatId });

    return (result.rowCount ?? 0) > 0;
  });
}

/**
 * Check if super-chat belongs to user
 */
export async function superChatBelongsToUser(superChatId: string, userId: string): Promise<boolean> {
  const result = await query(
    'SELECT 1 FROM super_chats WHERE id = $1 AND user_id = $2',
    [superChatId, userId]
  );
  return result.rows.length > 0;
}

// ============================================
// Context Links
// ============================================

/**
 * Create a link from a chat to a super-chat
 */
export async function linkChatToSuperChat(
  superChatId: string,
  sourceChatId: string
): Promise<IContextLink> {
  return withTransaction(async (client) => {
    // Create in PostgreSQL
    const result = await client.query<IContextLink>(`
      INSERT INTO context_links (super_chat_id, source_chat_id, link_type)
      VALUES ($1, $2, 'chat')
      RETURNING *
    `, [superChatId, sourceChatId]);

    const link = result.rows[0];

    // Create edge in Neo4j
    await runQuery(`
      MATCH (sc:${NodeLabels.SUPER_CHAT} {id: $superChatId})
      MERGE (c:${NodeLabels.CHAT} {id: $chatId})
      MERGE (sc)-[r:${RelationshipTypes.INCLUDES}]->(c)
      SET r.linkId = $linkId, r.createdAt = datetime()
    `, {
      superChatId,
      chatId: sourceChatId,
      linkId: link.id
    });

    // Update super-chat updated_at
    await client.query(
      'UPDATE super_chats SET updated_at = NOW() WHERE id = $1',
      [superChatId]
    );

    return link;
  });
}

/**
 * Create a link from a super-chat to another super-chat
 */
export async function linkSuperChatToSuperChat(
  targetSuperChatId: string,
  sourceSuperChatId: string
): Promise<IContextLink> {
  return withTransaction(async (client) => {
    // Create in PostgreSQL
    const result = await client.query<IContextLink>(`
      INSERT INTO context_links (super_chat_id, source_super_chat_id, link_type)
      VALUES ($1, $2, 'super_chat')
      RETURNING *
    `, [targetSuperChatId, sourceSuperChatId]);

    const link = result.rows[0];

    // Create edge in Neo4j
    await runQuery(`
      MATCH (target:${NodeLabels.SUPER_CHAT} {id: $targetId})
      MATCH (source:${NodeLabels.SUPER_CHAT} {id: $sourceId})
      MERGE (target)-[r:${RelationshipTypes.INCLUDES}]->(source)
      SET r.linkId = $linkId, r.createdAt = datetime()
    `, {
      targetId: targetSuperChatId,
      sourceId: sourceSuperChatId,
      linkId: link.id
    });

    return link;
  });
}

/**
 * Remove a context link
 */
export async function unlinkFromSuperChat(linkId: string): Promise<boolean> {
  return withTransaction(async (client) => {
    // Get link details first
    const linkResult = await client.query<IContextLink>(
      'SELECT * FROM context_links WHERE id = $1',
      [linkId]
    );
    
    if (linkResult.rows.length === 0) {
      return false;
    }

    const link = linkResult.rows[0];

    // Delete from PostgreSQL
    await client.query('DELETE FROM context_links WHERE id = $1', [linkId]);

    // Delete from Neo4j
    if (link.link_type === 'chat') {
      await runQuery(`
        MATCH (sc:${NodeLabels.SUPER_CHAT} {id: $superChatId})-[r:${RelationshipTypes.INCLUDES}]->(c:${NodeLabels.CHAT} {id: $chatId})
        DELETE r
      `, {
        superChatId: link.super_chat_id,
        chatId: link.source_chat_id
      });
    } else {
      await runQuery(`
        MATCH (target:${NodeLabels.SUPER_CHAT} {id: $targetId})-[r:${RelationshipTypes.INCLUDES}]->(source:${NodeLabels.SUPER_CHAT} {id: $sourceId})
        DELETE r
      `, {
        targetId: link.super_chat_id,
        sourceId: link.source_super_chat_id
      });
    }

    return true;
  });
}

/**
 * Get all links for a super-chat
 */
export async function getLinksForSuperChat(superChatId: string): Promise<IContextLinkWithDetails[]> {
  const result = await query<IContextLinkWithDetails>(`
    SELECT 
      cl.*,
      COALESCE(c.title, sc2.title) as source_title,
      COUNT(sm.id)::integer as selected_message_count,
      COALESCE(
        (SELECT COUNT(*) FROM messages WHERE chat_id = cl.source_chat_id),
        0
      )::integer as total_message_count
    FROM context_links cl
    LEFT JOIN chats c ON c.id = cl.source_chat_id
    LEFT JOIN super_chats sc2 ON sc2.id = cl.source_super_chat_id
    LEFT JOIN selected_messages sm ON sm.link_id = cl.id
    WHERE cl.super_chat_id = $1
    GROUP BY cl.id, c.title, sc2.title
    ORDER BY cl.created_at ASC
  `, [superChatId]);

  return result.rows;
}

/**
 * Get link by ID
 */
export async function getLinkById(linkId: string): Promise<IContextLink | null> {
  const result = await query<IContextLink>(
    'SELECT * FROM context_links WHERE id = $1',
    [linkId]
  );
  return result.rows[0] || null;
}

// ============================================
// Selected Messages for Links
// ============================================

/**
 * Set selected messages for a link
 */
export async function setSelectedMessagesForLink(
  linkId: string,
  messageIds: string[]
): Promise<void> {
  return withTransaction(async (client) => {
    // Clear existing selections
    await client.query('DELETE FROM selected_messages WHERE link_id = $1', [linkId]);

    // Insert new selections
    if (messageIds.length > 0) {
      const values = messageIds.map((_, i) => `($1, $${i + 2})`).join(', ');
      await client.query(
        `INSERT INTO selected_messages (link_id, message_id) VALUES ${values}`,
        [linkId, ...messageIds]
      );
    }
  });
}

/**
 * Get selected messages for a link
 */
export async function getSelectedMessagesForLink(linkId: string): Promise<string[]> {
  const result = await query<{ message_id: string }>(
    'SELECT message_id FROM selected_messages WHERE link_id = $1',
    [linkId]
  );
  return result.rows.map(r => r.message_id);
}

// ============================================
// Super-Chat Messages
// ============================================

/**
 * Add message to super-chat
 */
export async function addSuperChatMessage(
  superChatId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  tokenCount: number,
  contextSources: string[] = []
): Promise<ISuperChatMessage> {
  const result = await query<ISuperChatMessage>(`
    INSERT INTO super_chat_messages (super_chat_id, role, content, token_count, context_sources)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [superChatId, role, content, tokenCount, JSON.stringify(contextSources)]);

  // Update super-chat updated_at
  await query(
    'UPDATE super_chats SET updated_at = NOW() WHERE id = $1',
    [superChatId]
  );

  return result.rows[0];
}

/**
 * Get messages for super-chat
 */
export async function getSuperChatMessages(
  superChatId: string,
  limit: number = 100
): Promise<ISuperChatMessage[]> {
  const result = await query<ISuperChatMessage>(`
    SELECT * FROM super_chat_messages
    WHERE super_chat_id = $1
    ORDER BY created_at ASC
    LIMIT $2
  `, [superChatId, limit]);

  return result.rows;
}

export default {
  createSuperChat,
  getSuperChatsByUser,
  getSuperChatById,
  getSuperChatWithStats,
  updateSuperChat,
  deleteSuperChat,
  superChatBelongsToUser,
  linkChatToSuperChat,
  linkSuperChatToSuperChat,
  unlinkFromSuperChat,
  getLinksForSuperChat,
  getLinkById,
  setSelectedMessagesForLink,
  getSelectedMessagesForLink,
  addSuperChatMessage,
  getSuperChatMessages
};
