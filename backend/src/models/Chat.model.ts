import { query } from '../config/database';

/**
 * Chat interface
 */
export interface IChat {
  id: string;
  user_id: string;
  title: string | null;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
  position_x: number;
  position_y: number;
}

/**
 * Chat with message count
 */
export interface IChatWithStats extends IChat {
  message_count: number;
  selected_count: number;
  last_message_at: Date | null;
}

/**
 * Chat creation data
 */
export interface IChatCreate {
  user_id: string;
  title?: string;
  position_x?: number;
  position_y?: number;
}

/**
 * Chat update data
 */
export interface IChatUpdate {
  title?: string;
  position_x?: number;
  position_y?: number;
}

/**
 * Create a new chat
 */
export async function createChat(data: IChatCreate): Promise<IChat> {
  const result = await query<IChat>(`
    INSERT INTO chats (user_id, title, position_x, position_y)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [
    data.user_id,
    data.title || null,
    data.position_x ?? 0,
    data.position_y ?? 0
  ]);
  
  return result.rows[0];
}

/**
 * Get all active chats for a user
 */
export async function getChatsByUser(userId: string): Promise<IChatWithStats[]> {
  const result = await query<IChatWithStats>(`
    SELECT 
      c.*,
      COUNT(m.id)::integer as message_count,
      COUNT(m.id) FILTER (WHERE m.is_selected = true)::integer as selected_count,
      MAX(m.created_at) as last_message_at
    FROM chats c
    LEFT JOIN messages m ON m.chat_id = c.id
    WHERE c.user_id = $1 AND c.is_active = true
    GROUP BY c.id
    ORDER BY c.updated_at DESC
  `, [userId]);
  
  return result.rows;
}

/**
 * Get chat by ID
 */
export async function getChatById(chatId: string): Promise<IChat | null> {
  const result = await query<IChat>(
    'SELECT * FROM chats WHERE id = $1 AND is_active = true',
    [chatId]
  );
  return result.rows[0] || null;
}

/**
 * Get chat with stats
 */
export async function getChatWithStats(chatId: string): Promise<IChatWithStats | null> {
  const result = await query<IChatWithStats>(`
    SELECT 
      c.*,
      COUNT(m.id)::integer as message_count,
      COUNT(m.id) FILTER (WHERE m.is_selected = true)::integer as selected_count,
      MAX(m.created_at) as last_message_at
    FROM chats c
    LEFT JOIN messages m ON m.chat_id = c.id
    WHERE c.id = $1 AND c.is_active = true
    GROUP BY c.id
  `, [chatId]);
  
  return result.rows[0] || null;
}

/**
 * Update chat
 */
export async function updateChat(chatId: string, data: IChatUpdate): Promise<IChat | null> {
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

  if (updates.length === 0) {
    return getChatById(chatId);
  }

  params.push(chatId);

  const result = await query<IChat>(`
    UPDATE chats 
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND is_active = true
    RETURNING *
  `, params);

  return result.rows[0] || null;
}

/**
 * Soft delete chat
 */
export async function deleteChat(chatId: string): Promise<boolean> {
  const result = await query(
    'UPDATE chats SET is_active = false WHERE id = $1',
    [chatId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Check if chat belongs to user
 */
export async function chatBelongsToUser(chatId: string, userId: string): Promise<boolean> {
  const result = await query(
    'SELECT 1 FROM chats WHERE id = $1 AND user_id = $2 AND is_active = true',
    [chatId, userId]
  );
  return result.rows.length > 0;
}

/**
 * Get chat count for user
 */
export async function getChatCount(userId: string): Promise<number> {
  const result = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM chats WHERE user_id = $1 AND is_active = true',
    [userId]
  );
  return parseInt(result.rows[0].count, 10);
}

/**
 * Update chat positions (batch)
 */
export async function updateChatPositions(
  positions: Array<{ id: string; position_x: number; position_y: number }>
): Promise<void> {
  for (const pos of positions) {
    await query(
      'UPDATE chats SET position_x = $1, position_y = $2 WHERE id = $3',
      [pos.position_x, pos.position_y, pos.id]
    );
  }
}

export default {
  createChat,
  getChatsByUser,
  getChatById,
  getChatWithStats,
  updateChat,
  deleteChat,
  chatBelongsToUser,
  getChatCount,
  updateChatPositions
};
