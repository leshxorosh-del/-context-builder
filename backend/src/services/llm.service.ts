import { logger } from '../config/logger';
import { HttpErrors } from '../middleware/errorHandler';
import { 
  createCompletion, 
  createStreamingCompletion,
  isLLMAvailable, 
  SYSTEM_PROMPTS,
  LLMMessage,
  CompletionResult
} from '../config/llm';
import * as SuperChatModel from '../models/SuperChat.model';
import * as contextService from './context.service';
import * as tariffService from './tariff.service';
import { countTokens } from '../utils/tokenCounter';

/**
 * Query result
 */
export interface QueryResult {
  response: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  sources: Array<{
    chatId: string;
    chatTitle: string;
    messageCount: number;
  }>;
  quotaRemaining: number;
}

/**
 * Send a query to a super-chat with merged context
 */
export async function queryWithContext(
  superChatId: string,
  userMessage: string,
  userId: string
): Promise<QueryResult> {
  // Check if LLM is available
  if (!isLLMAvailable()) {
    throw HttpErrors.ServiceUnavailable(
      'Сервис ИИ временно недоступен. Проверьте настройки API ключа.',
      'LLM_UNAVAILABLE'
    );
  }

  // Verify ownership
  const belongs = await SuperChatModel.superChatBelongsToUser(superChatId, userId);
  if (!belongs) {
    throw HttpErrors.NotFound('Супер-чат не найден', 'SUPER_CHAT_NOT_FOUND');
  }

  // Check and decrement quota
  const quotaResult = await tariffService.checkAndDecrementQuota(userId);
  if (!quotaResult.success) {
    throw HttpErrors.TooManyRequests(
      'Лимит запросов исчерпан. Пополните тариф или дождитесь ежедневного начисления.',
      'QUOTA_EXCEEDED'
    );
  }

  try {
    // Build context payload
    const { context, sources } = await contextService.buildContextPayload(superChatId);

    // Get conversation history
    const history = await SuperChatModel.getSuperChatMessages(superChatId, 20);

    // Build messages for LLM
    const messages: LLMMessage[] = [
      { role: 'system', content: context.systemPrompt },
      { role: 'user', content: `Контекст из связанных чатов:\n${context.contextText}` }
    ];

    // Add conversation history
    for (const msg of history.slice(-10)) {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      });
    }

    // Add current user message
    messages.push({ role: 'user', content: userMessage });

    logger.debug('Sending query to LLM', {
      superChatId,
      contextTokens: context.totalTokens,
      sourceCount: sources.length
    });

    // Save user message
    const userTokenCount = countTokens(userMessage);
    await SuperChatModel.addSuperChatMessage(
      superChatId,
      'user',
      userMessage,
      userTokenCount,
      sources.map(s => s.chatId)
    );

    // Call LLM
    const completion = await createCompletion(messages);

    // Save assistant response
    await SuperChatModel.addSuperChatMessage(
      superChatId,
      'assistant',
      completion.content,
      completion.tokensUsed.completion,
      sources.map(s => s.chatId)
    );

    logger.info('LLM query completed', {
      superChatId,
      tokensUsed: completion.tokensUsed.total,
      quotaRemaining: quotaResult.remaining
    });

    return {
      response: completion.content,
      tokensUsed: completion.tokensUsed,
      sources: context.sources,
      quotaRemaining: quotaResult.remaining
    };

  } catch (error) {
    // Refund quota on error
    await tariffService.refundQuota(userId);
    throw error;
  }
}

/**
 * Stream a query response
 */
export async function streamQueryWithContext(
  superChatId: string,
  userMessage: string,
  userId: string,
  onChunk: (chunk: string) => void
): Promise<QueryResult> {
  // Check if LLM is available
  if (!isLLMAvailable()) {
    throw HttpErrors.ServiceUnavailable(
      'Сервис ИИ временно недоступен',
      'LLM_UNAVAILABLE'
    );
  }

  // Verify ownership
  const belongs = await SuperChatModel.superChatBelongsToUser(superChatId, userId);
  if (!belongs) {
    throw HttpErrors.NotFound('Супер-чат не найден', 'SUPER_CHAT_NOT_FOUND');
  }

  // Check and decrement quota
  const quotaResult = await tariffService.checkAndDecrementQuota(userId);
  if (!quotaResult.success) {
    throw HttpErrors.TooManyRequests(
      'Лимит запросов исчерпан',
      'QUOTA_EXCEEDED'
    );
  }

  try {
    const { context, sources } = await contextService.buildContextPayload(superChatId);
    const history = await SuperChatModel.getSuperChatMessages(superChatId, 20);

    const messages: LLMMessage[] = [
      { role: 'system', content: context.systemPrompt },
      { role: 'user', content: `Контекст:\n${context.contextText}` }
    ];

    for (const msg of history.slice(-10)) {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      });
    }

    messages.push({ role: 'user', content: userMessage });

    // Save user message
    await SuperChatModel.addSuperChatMessage(
      superChatId,
      'user',
      userMessage,
      countTokens(userMessage),
      sources.map(s => s.chatId)
    );

    // Stream completion
    const completion = await createStreamingCompletion(messages, onChunk);

    // Save assistant response
    await SuperChatModel.addSuperChatMessage(
      superChatId,
      'assistant',
      completion.content,
      completion.tokensUsed.completion,
      sources.map(s => s.chatId)
    );

    return {
      response: completion.content,
      tokensUsed: completion.tokensUsed,
      sources: context.sources,
      quotaRemaining: quotaResult.remaining
    };

  } catch (error) {
    await tariffService.refundQuota(userId);
    throw error;
  }
}

/**
 * Generate a daily digest for a super-chat
 */
export async function generateDailyDigest(
  superChatId: string,
  userId: string
): Promise<string> {
  if (!isLLMAvailable()) {
    throw HttpErrors.ServiceUnavailable('Сервис ИИ недоступен', 'LLM_UNAVAILABLE');
  }

  // Get recent messages (last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const { context, sources } = await contextService.buildContextPayload(superChatId);
  const recentMessages = await SuperChatModel.getSuperChatMessages(superChatId, 100);

  // Filter to last 24 hours
  const last24h = recentMessages.filter(m => new Date(m.created_at) > oneDayAgo);

  if (last24h.length === 0 && sources.length === 0) {
    return 'За последние 24 часа активности не было.';
  }

  const digestPrompt = `
Создай краткую сводку изменений за последние 24 часа.

Контекст из связанных чатов:
${context.contextText}

Сообщения в супер-чате за 24 часа:
${last24h.map(m => `[${m.role}]: ${m.content}`).join('\n')}

Создай сводку в формате:
1. Ключевые обсуждения
2. Принятые решения
3. Открытые вопросы
4. Рекомендации
`;

  const messages: LLMMessage[] = [
    { role: 'system', content: SYSTEM_PROMPTS.DAILY_DIGEST },
    { role: 'user', content: digestPrompt }
  ];

  const completion = await createCompletion(messages, { maxTokens: 1000 });

  logger.info('Daily digest generated', { superChatId, tokensUsed: completion.tokensUsed.total });

  return completion.content;
}

/**
 * Summarize a chat's content
 */
export async function summarizeChat(
  chatId: string,
  userId: string
): Promise<string> {
  if (!isLLMAvailable()) {
    throw HttpErrors.ServiceUnavailable('Сервис ИИ недоступен', 'LLM_UNAVAILABLE');
  }

  const { getMessagesByChat } = await import('../models/Message.model');
  const { chatBelongsToUser, getChatById } = await import('../models/Chat.model');

  const belongs = await chatBelongsToUser(chatId, userId);
  if (!belongs) {
    throw HttpErrors.NotFound('Чат не найден', 'CHAT_NOT_FOUND');
  }

  const chat = await getChatById(chatId);
  const messages = await getMessagesByChat(chatId, { limit: 100 });

  if (messages.length === 0) {
    return 'В чате нет сообщений для суммаризации.';
  }

  const chatContent = messages
    .map(m => `[${m.role === 'user' ? 'Пользователь' : 'Ассистент'}]: ${m.content}`)
    .join('\n');

  const completion = await createCompletion([
    { role: 'system', content: 'Создай краткое резюме диалога, выделив ключевые темы, решения и важные моменты.' },
    { role: 'user', content: `Чат: ${chat?.title || 'Без названия'}\n\n${chatContent}` }
  ], { maxTokens: 500 });

  return completion.content;
}

export default {
  queryWithContext,
  streamQueryWithContext,
  generateDailyDigest,
  summarizeChat
};
