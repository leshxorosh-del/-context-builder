import { query } from '../config/database';

/**
 * Message role type
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Message interface
 */
export interface IMessage {
  id: string;
  chat_id: string;
  role: MessageRole;
  content: string;
  token_count: number;
  created_at: Date;
  is_selected: boolean;
}

/**
 * Message creation data
 */
export interface IMessageCreate {
  chat_id: string;
  role: MessageRole;
  content: string;
  token_count?: number;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

/**
 * Add a message to a chat
 */
export async function addMessage(data: IMessageCreate): Promise<IMessage> {
  const result = await query<IMessage>(`
    INSERT INTO messages (chat_id, role, content, token_count)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [
    data.chat_id,
    data.role,
    data.content,
    data.token_count ?? 0
  ]);

  // Update chat's updated_at
  await query(
    'UPDATE chats SET updated_at = NOW() WHERE id = $1',
    [data.chat_id]
  );

  return result.rows[0];
}

/**
 * Get messages by chat ID with pagination
 */
export async function getMessagesByChat(
  chatId: string,
  options: PaginationOptions = {}
): Promise<IMessage[]> {
  const { limit = 100, offset = 0 } = options;

  const result = await query<IMessage>(`
    SELECT * FROM messages
    WHERE chat_id = $1
    ORDER BY created_at ASC
    LIMIT $2 OFFSET $3
  `, [chatId, limit, offset]);

  return result.rows;
}

/**
 * Get message by ID
 */
export async function getMessageById(messageId: string): Promise<IMessage | null> {
  const result = await query<IMessage>(
    'SELECT * FROM messages WHERE id = $1',
    [messageId]
  );
  return result.rows[0] || null;
}

/**
 * Update message selection status
 */
export async function updateSelection(
  messageId: string,
  isSelected: boolean
): Promise<IMessage | null> {
  const result = await query<IMessage>(`
    UPDATE messages
    SET is_selected = $1
    WHERE id = $2
    RETURNING *
  `, [isSelected, messageId]);

  return result.rows[0] || null;
}

/**
 * Get selected messages from a chat
 */
export async function getSelectedMessages(chatId: string): Promise<IMessage[]> {
  const result = await query<IMessage>(`
    SELECT * FROM messages
    WHERE chat_id = $1 AND is_selected = true
    ORDER BY created_at ASC
  `, [chatId]);

  return result.rows;
}

/**
 * Search messages in a chat
 */
export async function searchMessages(
  chatId: string,
  searchQuery: string
): Promise<IMessage[]> {
  const result = await query<IMessage>(`
    SELECT * FROM messages
    WHERE chat_id = $1 
      AND to_tsvector('russian', content) @@ plainto_tsquery('russian', $2)
    ORDER BY created_at DESC
    LIMIT 50
  `, [chatId, searchQuery]);

  return result.rows;
}

/**
 * Get message count for a chat
 */
export async function getMessageCount(chatId: string): Promise<number> {
  const result = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM messages WHERE chat_id = $1',
    [chatId]
  );
  return parseInt(result.rows[0].count, 10);
}

/**
 * Get selected message count for a chat
 */
export async function getSelectedMessageCount(chatId: string): Promise<number> {
  const result = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM messages WHERE chat_id = $1 AND is_selected = true',
    [chatId]
  );
  return parseInt(result.rows[0].count, 10);
}

/**
 * Get total token count for selected messages in a chat
 */
export async function getSelectedTokenCount(chatId: string): Promise<number> {
  const result = await query<{ total: string }>(
    'SELECT COALESCE(SUM(token_count), 0)::integer as total FROM messages WHERE chat_id = $1 AND is_selected = true',
    [chatId]
  );
  return parseInt(result.rows[0].total, 10);
}

/**
 * Bulk update message selections
 */
export async function bulkUpdateSelection(
  chatId: string,
  messageIds: string[],
  isSelected: boolean
): Promise<number> {
  if (messageIds.length === 0) return 0;

  const result = await query(`
    UPDATE messages
    SET is_selected = $1
    WHERE chat_id = $2 AND id = ANY($3::uuid[])
  `, [isSelected, chatId, messageIds]);

  return result.rowCount ?? 0;
}

/**
 * Select all messages in a chat
 */
export async function selectAllMessages(chatId: string): Promise<number> {
  const result = await query(
    'UPDATE messages SET is_selected = true WHERE chat_id = $1',
    [chatId]
  );
  return result.rowCount ?? 0;
}

/**
 * Deselect all messages in a chat
 */
export async function deselectAllMessages(chatId: string): Promise<number> {
  const result = await query(
    'UPDATE messages SET is_selected = false WHERE chat_id = $1',
    [chatId]
  );
  return result.rowCount ?? 0;
}

/**
 * Delete message
 */
export async function deleteMessage(messageId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM messages WHERE id = $1',
    [messageId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Get messages created after a certain date
 */
export async function getMessagesAfter(
  chatId: string,
  afterDate: Date
): Promise<IMessage[]> {
  const result = await query<IMessage>(`
    SELECT * FROM messages
    WHERE chat_id = $1 AND created_at > $2
    ORDER BY created_at ASC
  `, [chatId, afterDate]);

  return result.rows;
}

/**
 * Get latest messages from a chat
 */
export async function getLatestMessages(
  chatId: string,
  limit: number = 50
): Promise<IMessage[]> {
  const result = await query<IMessage>(`
    SELECT * FROM (
      SELECT * FROM messages
      WHERE chat_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    ) sub
    ORDER BY created_at ASC
  `, [chatId, limit]);

  return result.rows;
}

export default {
  addMessage,
  getMessagesByChat,
  getMessageById,
  updateSelection,
  getSelectedMessages,
  searchMessages,
  getMessageCount,
  getSelectedMessageCount,
  getSelectedTokenCount,
  bulkUpdateSelection,
  selectAllMessages,
  deselectAllMessages,
  deleteMessage,
  getMessagesAfter,
  getLatestMessages
};
