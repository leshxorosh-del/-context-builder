/**
 * Token Counter Tests
 */

import {
  countTokens,
  countMessagesTokens,
  countContextTokens,
  fitsWithinLimit,
  truncateToTokenLimit,
  splitIntoChunks,
  TOKEN_LIMITS
} from '../tokenCounter';

describe('Token Counter', () => {
  describe('countTokens', () => {
    it('should return 0 for empty string', () => {
      expect(countTokens('')).toBe(0);
    });

    it('should return 0 for null/undefined', () => {
      expect(countTokens(null as unknown as string)).toBe(0);
      expect(countTokens(undefined as unknown as string)).toBe(0);
    });

    it('should estimate tokens for English text', () => {
      const text = 'Hello, this is a test message.';
      const tokens = countTokens(text);
      
      // Approximately 30 chars / 3.5 ≈ 9 tokens
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(15);
    });

    it('should estimate tokens for Russian text', () => {
      const text = 'Привет, это тестовое сообщение.';
      const tokens = countTokens(text);
      
      expect(tokens).toBeGreaterThan(0);
    });

    it('should handle long text', () => {
      const text = 'Lorem ipsum '.repeat(1000);
      const tokens = countTokens(text);
      
      expect(tokens).toBeGreaterThan(1000);
    });
  });

  describe('countMessagesTokens', () => {
    it('should count tokens for array of messages', () => {
      const messages = [
        { content: 'Hello', role: 'user' },
        { content: 'Hi there!', role: 'assistant' }
      ];

      const tokens = countMessagesTokens(messages);
      
      // Content tokens + overhead (4 per message)
      expect(tokens).toBeGreaterThan(8); // At least 4 + 4 overhead
    });

    it('should return 0 for empty array', () => {
      expect(countMessagesTokens([])).toBe(0);
    });
  });

  describe('countContextTokens', () => {
    it('should include source attribution in count', () => {
      const messages = [
        { content: 'Test message', chat_title: 'Chat A' }
      ];

      const withTitle = countContextTokens(messages);
      const withoutTitle = countContextTokens([{ content: 'Test message' }]);

      expect(withTitle).toBeGreaterThan(withoutTitle);
    });
  });

  describe('fitsWithinLimit', () => {
    it('should return true for short text', () => {
      expect(fitsWithinLimit('Short', 100)).toBe(true);
    });

    it('should return false for text exceeding limit', () => {
      const longText = 'A'.repeat(1000);
      expect(fitsWithinLimit(longText, 10)).toBe(false);
    });
  });

  describe('truncateToTokenLimit', () => {
    it('should not truncate text within limit', () => {
      const text = 'Short text';
      expect(truncateToTokenLimit(text, 100)).toBe(text);
    });

    it('should truncate long text and add ellipsis', () => {
      const longText = 'This is a very long text. '.repeat(100);
      const truncated = truncateToTokenLimit(longText, 20);

      expect(truncated.endsWith('...')).toBe(true);
      expect(truncated.length).toBeLessThan(longText.length);
    });

    it('should try to break at sentence boundary', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const truncated = truncateToTokenLimit(text, 10);

      // Should end with a period before the ellipsis
      expect(truncated).toMatch(/\.\.\./);
    });
  });

  describe('splitIntoChunks', () => {
    it('should split text into multiple chunks', () => {
      const text = 'Sentence one. Sentence two. Sentence three. Sentence four.';
      const chunks = splitIntoChunks(text, 10);

      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect(countTokens(chunk)).toBeLessThanOrEqual(15); // Some tolerance
      });
    });

    it('should handle text that fits in one chunk', () => {
      const text = 'Short text.';
      const chunks = splitIntoChunks(text, 100);

      expect(chunks.length).toBe(1);
      expect(chunks[0]).toBe(text);
    });
  });

  describe('TOKEN_LIMITS', () => {
    it('should have reasonable default limits', () => {
      expect(TOKEN_LIMITS.MODEL_CONTEXT).toBe(128000);
      expect(TOKEN_LIMITS.MAX_RESPONSE).toBe(4096);
      expect(TOKEN_LIMITS.SYSTEM_PROMPT).toBe(500);
      expect(TOKEN_LIMITS.USER_MESSAGE).toBe(2000);
    });

    it('should calculate available context correctly', () => {
      const available = TOKEN_LIMITS.AVAILABLE_CONTEXT;
      const expected = 
        TOKEN_LIMITS.MODEL_CONTEXT - 
        TOKEN_LIMITS.SYSTEM_PROMPT - 
        TOKEN_LIMITS.USER_MESSAGE - 
        TOKEN_LIMITS.MAX_RESPONSE;

      expect(available).toBe(expected);
    });
  });
});
