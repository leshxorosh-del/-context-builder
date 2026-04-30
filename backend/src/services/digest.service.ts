import { logger } from '../config/logger';
import { query } from '../config/database';
import { HttpErrors } from '../middleware/errorHandler';
import * as SuperChatModel from '../models/SuperChat.model';
import * as llmService from './llm.service';

/**
 * Digest interface
 */
export interface IDigest {
  id: string;
  super_chat_id: string;
  user_id: string;
  content: string;
  period_start: Date;
  period_end: Date;
  message_count: number;
  sent_to: string[];
  sent_at: Date | null;
  created_at: Date;
}

/**
 * Generate and store a digest for a super-chat
 */
export async function generateAndStoreDigest(
  superChatId: string,
  userId: string
): Promise<IDigest> {
  // Verify ownership
  const belongs = await SuperChatModel.superChatBelongsToUser(superChatId, userId);
  if (!belongs) {
    throw HttpErrors.NotFound('Супер-чат не найден', 'SUPER_CHAT_NOT_FOUND');
  }

  // Generate digest content using LLM
  const content = await llmService.generateDailyDigest(superChatId, userId);

  // Calculate period
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 24 * 60 * 60 * 1000);

  // Get message count for the period
  const countResult = await query<{ count: string }>(`
    SELECT COUNT(*) as count FROM super_chat_messages
    WHERE super_chat_id = $1 AND created_at BETWEEN $2 AND $3
  `, [superChatId, periodStart, periodEnd]);
  
  const messageCount = parseInt(countResult.rows[0].count, 10);

  // Store digest
  const result = await query<IDigest>(`
    INSERT INTO digests (super_chat_id, user_id, content, period_start, period_end, message_count)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [superChatId, userId, content, periodStart, periodEnd, messageCount]);

  const digest = result.rows[0];

  logger.info('Digest generated', { 
    digestId: digest.id, 
    superChatId, 
    messageCount 
  });

  return digest;
}

/**
 * Get latest digest for a super-chat
 */
export async function getLatestDigest(
  superChatId: string,
  userId: string
): Promise<IDigest | null> {
  const belongs = await SuperChatModel.superChatBelongsToUser(superChatId, userId);
  if (!belongs) {
    throw HttpErrors.NotFound('Супер-чат не найден', 'SUPER_CHAT_NOT_FOUND');
  }

  const result = await query<IDigest>(`
    SELECT * FROM digests
    WHERE super_chat_id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `, [superChatId]);

  return result.rows[0] || null;
}

/**
 * Get digest history for a super-chat
 */
export async function getDigestHistory(
  superChatId: string,
  userId: string,
  limit: number = 10
): Promise<IDigest[]> {
  const belongs = await SuperChatModel.superChatBelongsToUser(superChatId, userId);
  if (!belongs) {
    throw HttpErrors.NotFound('Супер-чат не найден', 'SUPER_CHAT_NOT_FOUND');
  }

  const result = await query<IDigest>(`
    SELECT * FROM digests
    WHERE super_chat_id = $1
    ORDER BY created_at DESC
    LIMIT $2
  `, [superChatId, limit]);

  return result.rows;
}

/**
 * Mark digest as sent
 */
export async function markDigestSent(
  digestId: string,
  channels: string[]
): Promise<void> {
  await query(`
    UPDATE digests
    SET sent_to = $1, sent_at = NOW()
    WHERE id = $2
  `, [JSON.stringify(channels), digestId]);
}

/**
 * Get unsent digests
 */
export async function getUnsentDigests(): Promise<IDigest[]> {
  const result = await query<IDigest>(`
    SELECT * FROM digests
    WHERE sent_at IS NULL
    ORDER BY created_at ASC
  `);

  return result.rows;
}

/**
 * Get super-chats that need digests
 */
export async function getSuperChatsNeedingDigests(): Promise<Array<{
  superChatId: string;
  userId: string;
  title: string;
}>> {
  // Find super-chats with activity in the last 24 hours
  // that haven't had a digest generated today
  const result = await query<{
    super_chat_id: string;
    user_id: string;
    title: string;
  }>(`
    SELECT DISTINCT 
      sc.id as super_chat_id,
      sc.user_id,
      sc.title
    FROM super_chats sc
    JOIN super_chat_messages scm ON scm.super_chat_id = sc.id
    WHERE scm.created_at > NOW() - INTERVAL '24 hours'
      AND NOT EXISTS (
        SELECT 1 FROM digests d
        WHERE d.super_chat_id = sc.id
          AND d.created_at > NOW() - INTERVAL '24 hours'
      )
  `);

  return result.rows.map(r => ({
    superChatId: r.super_chat_id,
    userId: r.user_id,
    title: r.title
  }));
}

export default {
  generateAndStoreDigest,
  getLatestDigest,
  getDigestHistory,
  markDigestSent,
  getUnsentDigests,
  getSuperChatsNeedingDigests
};
