import { IMessage } from '../models/Message.model';
import { countTokens, TOKEN_LIMITS, truncateToTokenLimit } from './tokenCounter';
import { createCompletion, SYSTEM_PROMPTS, isLLMAvailable } from '../config/llm';

/**
 * Context source with messages
 */
export interface ContextSource {
  chatId: string;
  chatTitle: string;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    created_at: Date;
  }>;
  isSelectedOnly: boolean;
}

/**
 * Merged context ready for LLM
 */
export interface MergedContext {
  systemPrompt: string;
  contextText: string;
  totalTokens: number;
  sources: Array<{
    chatId: string;
    chatTitle: string;
    messageCount: number;
  }>;
  wasOptimized: boolean;
}

/**
 * Merge contexts from multiple sources into a single prompt
 */
export function mergeContexts(
  sources: ContextSource[],
  maxTokens: number = TOKEN_LIMITS.RECOMMENDED_CONTEXT
): MergedContext {
  const systemPrompt = SYSTEM_PROMPTS.SUPER_CHAT_CONTEXT;
  let contextParts: string[] = [];
  let totalTokens = countTokens(systemPrompt);
  let wasOptimized = false;

  // Sort sources by message timestamp to maintain chronological order
  const allMessages: Array<{
    chatId: string;
    chatTitle: string;
    message: ContextSource['messages'][0];
  }> = [];

  for (const source of sources) {
    for (const message of source.messages) {
      allMessages.push({
        chatId: source.chatId,
        chatTitle: source.chatTitle,
        message
      });
    }
  }

  // Sort by timestamp
  allMessages.sort((a, b) => 
    new Date(a.message.created_at).getTime() - new Date(b.message.created_at).getTime()
  );

  // Group by chat for context text
  const chatGroups = new Map<string, { title: string; messages: string[] }>();

  for (const item of allMessages) {
    if (!chatGroups.has(item.chatId)) {
      chatGroups.set(item.chatId, {
        title: item.chatTitle,
        messages: []
      });
    }
    const group = chatGroups.get(item.chatId)!;
    const roleLabel = item.message.role === 'user' ? 'Пользователь' : 'Ассистент';
    group.messages.push(`[${roleLabel}]: ${item.message.content}`);
  }

  // Build context text
  for (const [chatId, group] of chatGroups) {
    const chatContext = `\n--- Из чата "${group.title}" ---\n${group.messages.join('\n')}\n`;
    const chatTokens = countTokens(chatContext);

    if (totalTokens + chatTokens > maxTokens) {
      // Try to truncate this chat's content
      const remainingTokens = maxTokens - totalTokens - 100; // Buffer
      if (remainingTokens > 500) {
        const truncated = truncateToTokenLimit(chatContext, remainingTokens);
        contextParts.push(truncated);
        wasOptimized = true;
      }
      break;
    }

    contextParts.push(chatContext);
    totalTokens += chatTokens;
  }

  const contextText = contextParts.join('\n');

  // Build sources summary
  const sourceSummary = Array.from(chatGroups.entries()).map(([chatId, group]) => ({
    chatId,
    chatTitle: group.title,
    messageCount: group.messages.length
  }));

  return {
    systemPrompt,
    contextText,
    totalTokens,
    sources: sourceSummary,
    wasOptimized
  };
}

/**
 * Deduplicate messages by content similarity
 */
export function deduplicateMessages(
  messages: IMessage[]
): IMessage[] {
  const seen = new Set<string>();
  const unique: IMessage[] = [];

  for (const message of messages) {
    // Create a hash based on content (simplified)
    const contentHash = message.content.trim().toLowerCase().substring(0, 200);
    
    if (!seen.has(contentHash)) {
      seen.add(contentHash);
      unique.push(message);
    }
  }

  return unique;
}

/**
 * Optimize context by summarizing if too long
 */
export async function optimizeContext(
  contextText: string,
  maxTokens: number
): Promise<{ optimizedText: string; wasSummarized: boolean }> {
  const currentTokens = countTokens(contextText);

  if (currentTokens <= maxTokens) {
    return { optimizedText: contextText, wasSummarized: false };
  }

  // If LLM is not available, just truncate
  if (!isLLMAvailable()) {
    return {
      optimizedText: truncateToTokenLimit(contextText, maxTokens),
      wasSummarized: false
    };
  }

  // Use LLM to summarize
  try {
    const result = await createCompletion([
      { role: 'system', content: SYSTEM_PROMPTS.CONTEXT_SUMMARIZE },
      { role: 'user', content: `Сожми следующий контекст до ${Math.floor(maxTokens * 0.8)} токенов, сохранив ключевую информацию:\n\n${contextText}` }
    ], {
      maxTokens: Math.floor(maxTokens * 0.9)
    });

    return {
      optimizedText: result.content,
      wasSummarized: true
    };
  } catch (error) {
    // Fallback to truncation
    return {
      optimizedText: truncateToTokenLimit(contextText, maxTokens),
      wasSummarized: false
    };
  }
}

/**
 * Format context for display in the UI
 */
export function formatContextForDisplay(
  sources: Array<{ chatTitle: string; messageCount: number }>
): string {
  if (sources.length === 0) {
    return 'Нет связанных источников';
  }

  const parts = sources.map(s => 
    `${s.chatTitle} (${s.messageCount} ${pluralize(s.messageCount, 'сообщение', 'сообщения', 'сообщений')})`
  );

  return `Собран из: ${parts.join(', ')}`;
}

/**
 * Russian pluralization helper
 */
function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return one;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return few;
  }
  return many;
}

/**
 * Calculate context weight/relevance score
 */
export function calculateContextRelevance(
  message: IMessage,
  query: string
): number {
  const queryWords = query.toLowerCase().split(/\s+/);
  const contentWords = message.content.toLowerCase().split(/\s+/);
  
  let matches = 0;
  for (const qWord of queryWords) {
    if (qWord.length < 3) continue;
    for (const cWord of contentWords) {
      if (cWord.includes(qWord) || qWord.includes(cWord)) {
        matches++;
        break;
      }
    }
  }

  // Higher score for assistant messages (usually contain answers)
  const roleBonus = message.role === 'assistant' ? 1.2 : 1.0;
  
  // Recency bonus (newer messages might be more relevant)
  const ageInDays = (Date.now() - new Date(message.created_at).getTime()) / (1000 * 60 * 60 * 24);
  const recencyBonus = Math.max(0.5, 1 - ageInDays / 30);

  return (matches / Math.max(queryWords.length, 1)) * roleBonus * recencyBonus;
}

export default {
  mergeContexts,
  deduplicateMessages,
  optimizeContext,
  formatContextForDisplay,
  calculateContextRelevance
};
