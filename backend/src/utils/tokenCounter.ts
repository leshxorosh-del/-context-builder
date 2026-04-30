/**
 * Token counting utilities
 * 
 * Note: This is an approximation. For exact counts, use tiktoken library.
 * Average: ~4 characters per token for English, ~2-3 for Russian
 */

/**
 * Approximate token count for a given text
 * Uses a conservative estimate of 3.5 characters per token
 */
export function countTokens(text: string): number {
  if (!text) return 0;
  
  // Conservative estimate: ~3.5 chars per token for mixed content
  const charCount = text.length;
  return Math.ceil(charCount / 3.5);
}

/**
 * Count tokens for an array of messages
 */
export function countMessagesTokens(
  messages: Array<{ content: string; role?: string }>
): number {
  let totalTokens = 0;
  
  for (const message of messages) {
    // Add tokens for content
    totalTokens += countTokens(message.content);
    
    // Add overhead for message structure (~4 tokens per message)
    totalTokens += 4;
  }
  
  return totalTokens;
}

/**
 * Count tokens for context payload
 */
export function countContextTokens(
  selectedMessages: Array<{ content: string; chat_title?: string }>
): number {
  let totalTokens = 0;
  
  for (const message of selectedMessages) {
    // Add tokens for content
    totalTokens += countTokens(message.content);
    
    // Add tokens for source attribution if present
    if (message.chat_title) {
      totalTokens += countTokens(`Из чата "${message.chat_title}": `);
    }
    
    // Add overhead
    totalTokens += 4;
  }
  
  return totalTokens;
}

/**
 * Estimate if content fits within token limit
 */
export function fitsWithinLimit(text: string, maxTokens: number): boolean {
  return countTokens(text) <= maxTokens;
}

/**
 * Truncate text to fit within token limit
 * Returns truncated text with "..." appended if truncated
 */
export function truncateToTokenLimit(text: string, maxTokens: number): string {
  const currentTokens = countTokens(text);
  
  if (currentTokens <= maxTokens) {
    return text;
  }
  
  // Estimate characters for max tokens
  const maxChars = Math.floor(maxTokens * 3.5);
  
  // Find a good break point (end of sentence or word)
  let truncated = text.substring(0, maxChars);
  
  // Try to break at sentence
  const lastSentence = truncated.lastIndexOf('.');
  if (lastSentence > maxChars * 0.8) {
    truncated = truncated.substring(0, lastSentence + 1);
  } else {
    // Break at word
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxChars * 0.8) {
      truncated = truncated.substring(0, lastSpace);
    }
  }
  
  return truncated + '...';
}

/**
 * Split text into chunks that fit within token limit
 */
export function splitIntoChunks(text: string, maxTokensPerChunk: number): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  let currentChunk = '';
  let currentTokens = 0;
  
  for (const sentence of sentences) {
    const sentenceTokens = countTokens(sentence);
    
    if (currentTokens + sentenceTokens > maxTokensPerChunk) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
      currentTokens = sentenceTokens;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
      currentTokens += sentenceTokens;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Token limits for different contexts
 */
export const TOKEN_LIMITS = {
  // OpenAI GPT-4 Turbo context window
  MODEL_CONTEXT: 128000,
  
  // Max tokens for a single response
  MAX_RESPONSE: 4096,
  
  // Reserved for system prompt
  SYSTEM_PROMPT: 500,
  
  // Reserved for user's current message
  USER_MESSAGE: 2000,
  
  // Available for context (calculated)
  get AVAILABLE_CONTEXT(): number {
    return this.MODEL_CONTEXT - this.SYSTEM_PROMPT - this.USER_MESSAGE - this.MAX_RESPONSE;
  },
  
  // Recommended max context for good quality responses
  RECOMMENDED_CONTEXT: 50000,
  
  // Warning threshold for context size
  CONTEXT_WARNING_THRESHOLD: 80000
} as const;

export default {
  countTokens,
  countMessagesTokens,
  countContextTokens,
  fitsWithinLimit,
  truncateToTokenLimit,
  splitIntoChunks,
  TOKEN_LIMITS
};
