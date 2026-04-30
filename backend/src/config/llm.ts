import OpenAI from 'openai';
import { env } from './env';
import { logger } from './logger';

/**
 * OpenAI client instance
 */
let openaiClient: OpenAI | null = null;

/**
 * Initialize OpenAI client
 */
export function initializeLLM(): void {
  if (!env.openai.apiKey) {
    logger.warn('OpenAI API key not configured. LLM features will be disabled.');
    return;
  }

  openaiClient = new OpenAI({
    apiKey: env.openai.apiKey
  });

  logger.info('OpenAI client initialized', { model: env.openai.model });
}

/**
 * Get OpenAI client instance
 */
export function getOpenAI(): OpenAI {
  if (!openaiClient) {
    throw new Error('OpenAI client not initialized or API key not configured.');
  }
  return openaiClient;
}

/**
 * Check if LLM is available
 */
export function isLLMAvailable(): boolean {
  return openaiClient !== null;
}

/**
 * LLM Message role types
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * LLM Message structure
 */
export interface LLMMessage {
  role: MessageRole;
  content: string;
}

/**
 * LLM completion options
 */
export interface CompletionOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

/**
 * LLM completion result
 */
export interface CompletionResult {
  content: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  model: string;
  finishReason: string | null;
}

/**
 * Create a chat completion
 * @param messages Array of messages for the conversation
 * @param options Optional completion parameters
 */
export async function createCompletion(
  messages: LLMMessage[],
  options: CompletionOptions = {}
): Promise<CompletionResult> {
  const client = getOpenAI();
  const start = Date.now();

  try {
    const response = await client.chat.completions.create({
      model: env.openai.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      })),
      max_tokens: options.maxTokens ?? env.openai.maxTokens,
      temperature: options.temperature ?? 0.7,
      top_p: options.topP ?? 1,
      frequency_penalty: options.frequencyPenalty ?? 0,
      presence_penalty: options.presencePenalty ?? 0
    });

    const duration = Date.now() - start;
    const choice = response.choices[0];

    logger.debug('LLM completion created', {
      model: response.model,
      tokensUsed: response.usage?.total_tokens,
      duration,
      finishReason: choice?.finish_reason
    });

    return {
      content: choice?.message?.content || '',
      tokensUsed: {
        prompt: response.usage?.prompt_tokens || 0,
        completion: response.usage?.completion_tokens || 0,
        total: response.usage?.total_tokens || 0
      },
      model: response.model,
      finishReason: choice?.finish_reason || null
    };
  } catch (error) {
    logger.error('LLM completion error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Create a streaming chat completion
 * @param messages Array of messages for the conversation
 * @param onChunk Callback for each chunk of the response
 * @param options Optional completion parameters
 */
export async function createStreamingCompletion(
  messages: LLMMessage[],
  onChunk: (chunk: string) => void,
  options: CompletionOptions = {}
): Promise<CompletionResult> {
  const client = getOpenAI();
  let fullContent = '';

  const stream = await client.chat.completions.create({
    model: env.openai.model,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content
    })),
    max_tokens: options.maxTokens ?? env.openai.maxTokens,
    temperature: options.temperature ?? 0.7,
    stream: true
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) {
      fullContent += content;
      onChunk(content);
    }
  }

  // Note: Token usage is not available in streaming mode
  // We estimate based on content length
  const estimatedTokens = Math.ceil(fullContent.length / 4);

  return {
    content: fullContent,
    tokensUsed: {
      prompt: 0, // Not available in streaming
      completion: estimatedTokens,
      total: estimatedTokens
    },
    model: env.openai.model,
    finishReason: 'stop'
  };
}

// ============================================
// System Prompts
// ============================================

/**
 * System prompt for super-chat context queries
 */
export const SYSTEM_PROMPTS = {
  SUPER_CHAT_CONTEXT: `Ты — ИИ-ассистент в системе "Конструктор контекста". 
Пользователь объединил несколько чатов в единый контекст, и теперь ты имеешь доступ к информации из всех этих источников.

Правила работы:
1. Используй предоставленный контекст из разных чатов для формирования ответа
2. Если информация из разных чатов противоречит друг другу, отметь это
3. Ссылайся на источник, когда цитируешь конкретную информацию: "Из чата [название]..."
4. Отвечай на русском языке, если не указано иное
5. Будь точен и конкретен, избегай общих фраз`,

  DAILY_DIGEST: `Ты — ИИ-ассистент, создающий ежедневные сводки изменений.
Проанализируй предоставленные сообщения за последние 24 часа и создай краткую сводку.

Формат сводки:
1. Ключевые обсуждения (2-3 пункта)
2. Принятые решения (если есть)
3. Открытые вопросы (если есть)
4. Рекомендации для следующего шага

Сводка должна быть краткой (до 300 слов), информативной и действенной.`,

  CONTEXT_SUMMARIZE: `Ты — ИИ-ассистент, оптимизирующий контекст.
Сожми предоставленные сообщения, сохранив ключевую информацию.
Удали повторы, приветствия и малозначимые детали.
Сохрани факты, решения, технические детали и договорённости.`
} as const;

export default {
  initializeLLM,
  getOpenAI,
  isLLMAvailable,
  createCompletion,
  createStreamingCompletion,
  SYSTEM_PROMPTS
};
