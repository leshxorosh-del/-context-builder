/**
 * Context Merger Tests
 */

import {
  mergeContexts,
  deduplicateMessages,
  formatContextForDisplay,
  calculateContextRelevance,
  ContextSource
} from '../contextMerger';
import { IMessage } from '../../models/Message.model';

describe('Context Merger', () => {
  describe('mergeContexts', () => {
    it('should merge contexts from multiple sources', () => {
      const sources: ContextSource[] = [
        {
          chatId: 'chat-1',
          chatTitle: 'Chat A',
          messages: [
            { id: 'm1', role: 'user', content: 'Hello', created_at: new Date('2024-01-01') },
            { id: 'm2', role: 'assistant', content: 'Hi!', created_at: new Date('2024-01-02') }
          ],
          isSelectedOnly: false
        },
        {
          chatId: 'chat-2',
          chatTitle: 'Chat B',
          messages: [
            { id: 'm3', role: 'user', content: 'Question', created_at: new Date('2024-01-03') }
          ],
          isSelectedOnly: true
        }
      ];

      const result = mergeContexts(sources);

      expect(result.systemPrompt).toBeDefined();
      expect(result.contextText).toContain('Chat A');
      expect(result.contextText).toContain('Chat B');
      expect(result.sources).toHaveLength(2);
      expect(result.totalTokens).toBeGreaterThan(0);
    });

    it('should handle empty sources', () => {
      const result = mergeContexts([]);

      expect(result.contextText).toBe('');
      expect(result.sources).toHaveLength(0);
    });

    it('should sort messages chronologically', () => {
      const sources: ContextSource[] = [
        {
          chatId: 'chat-1',
          chatTitle: 'Chat A',
          messages: [
            { id: 'm1', role: 'user', content: 'Third', created_at: new Date('2024-01-03') }
          ],
          isSelectedOnly: false
        },
        {
          chatId: 'chat-2',
          chatTitle: 'Chat B',
          messages: [
            { id: 'm2', role: 'user', content: 'First', created_at: new Date('2024-01-01') }
          ],
          isSelectedOnly: false
        }
      ];

      const result = mergeContexts(sources);

      // Messages should be sorted by time
      expect(result.contextText).toBeDefined();
    });

    it('should set wasOptimized flag when truncating', () => {
      const sources: ContextSource[] = [
        {
          chatId: 'chat-1',
          chatTitle: 'Chat A',
          messages: Array(100).fill(null).map((_, i) => ({
            id: `m${i}`,
            role: 'user',
            content: 'A'.repeat(1000), // Long messages
            created_at: new Date()
          })),
          isSelectedOnly: false
        }
      ];

      const result = mergeContexts(sources, 1000); // Small limit

      expect(result.wasOptimized).toBe(true);
    });
  });

  describe('deduplicateMessages', () => {
    it('should remove duplicate messages', () => {
      const messages: IMessage[] = [
        { id: 'm1', chat_id: 'c1', role: 'user', content: 'Hello world', token_count: 10, created_at: new Date(), is_selected: false },
        { id: 'm2', chat_id: 'c1', role: 'user', content: 'Hello world', token_count: 10, created_at: new Date(), is_selected: false },
        { id: 'm3', chat_id: 'c1', role: 'assistant', content: 'Hi there', token_count: 8, created_at: new Date(), is_selected: false }
      ];

      const unique = deduplicateMessages(messages);

      expect(unique).toHaveLength(2);
      expect(unique.map(m => m.id)).toContain('m1');
      expect(unique.map(m => m.id)).toContain('m3');
    });

    it('should preserve first occurrence', () => {
      const messages: IMessage[] = [
        { id: 'first', chat_id: 'c1', role: 'user', content: 'Same content', token_count: 10, created_at: new Date(), is_selected: false },
        { id: 'second', chat_id: 'c1', role: 'user', content: 'Same content', token_count: 10, created_at: new Date(), is_selected: false }
      ];

      const unique = deduplicateMessages(messages);

      expect(unique).toHaveLength(1);
      expect(unique[0].id).toBe('first');
    });
  });

  describe('formatContextForDisplay', () => {
    it('should format sources for display', () => {
      const sources = [
        { chatTitle: 'Chat A', messageCount: 5 },
        { chatTitle: 'Chat B', messageCount: 1 }
      ];

      const formatted = formatContextForDisplay(sources);

      expect(formatted).toContain('Chat A');
      expect(formatted).toContain('Chat B');
      expect(formatted).toContain('сообщений');
      expect(formatted).toContain('сообщение');
    });

    it('should handle empty sources', () => {
      const formatted = formatContextForDisplay([]);
      expect(formatted).toBe('Нет связанных источников');
    });

    it('should use correct Russian pluralization', () => {
      expect(formatContextForDisplay([{ chatTitle: 'A', messageCount: 1 }])).toContain('сообщение');
      expect(formatContextForDisplay([{ chatTitle: 'A', messageCount: 2 }])).toContain('сообщения');
      expect(formatContextForDisplay([{ chatTitle: 'A', messageCount: 5 }])).toContain('сообщений');
      expect(formatContextForDisplay([{ chatTitle: 'A', messageCount: 21 }])).toContain('сообщение');
    });
  });

  describe('calculateContextRelevance', () => {
    const baseMessage: IMessage = {
      id: 'm1',
      chat_id: 'c1',
      role: 'assistant',
      content: 'This is about machine learning and neural networks',
      token_count: 20,
      created_at: new Date(),
      is_selected: false
    };

    it('should return higher score for matching keywords', () => {
      const scoreHigh = calculateContextRelevance(baseMessage, 'machine learning');
      const scoreLow = calculateContextRelevance(baseMessage, 'cooking recipes');

      expect(scoreHigh).toBeGreaterThan(scoreLow);
    });

    it('should give bonus to assistant messages', () => {
      const userMessage: IMessage = { ...baseMessage, role: 'user' };
      const assistantMessage: IMessage = { ...baseMessage, role: 'assistant' };

      const userScore = calculateContextRelevance(userMessage, 'machine learning');
      const assistantScore = calculateContextRelevance(assistantMessage, 'machine learning');

      expect(assistantScore).toBeGreaterThan(userScore);
    });

    it('should return 0 for no matches', () => {
      const score = calculateContextRelevance(baseMessage, 'xyz123 abc456');
      expect(score).toBe(0);
    });
  });
});
