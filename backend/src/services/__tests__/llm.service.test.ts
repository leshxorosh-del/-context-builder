/**
 * LLM Service Tests
 */

jest.mock('../../config/llm', () => ({
  createCompletion: jest.fn(),
  createStreamingCompletion: jest.fn(),
  isLLMAvailable: jest.fn().mockReturnValue(true),
  SYSTEM_PROMPTS: {
    SUPER_CHAT_CONTEXT: 'Test system prompt',
    DAILY_DIGEST: 'Digest prompt',
    CONTEXT_SUMMARIZE: 'Summarize prompt'
  }
}));

jest.mock('../../config/database', () => ({
  query: jest.fn()
}));

jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../tariff.service', () => ({
  checkAndDecrementQuota: jest.fn().mockResolvedValue({ success: true, remaining: 10, plan: 'monthly' }),
  refundQuota: jest.fn()
}));

jest.mock('../context.service', () => ({
  buildContextPayload: jest.fn().mockResolvedValue({
    context: {
      systemPrompt: 'System',
      contextText: 'Context text',
      totalTokens: 100,
      sources: [{ chatId: 'chat-1', chatTitle: 'Chat 1', messageCount: 5 }],
      wasOptimized: false
    },
    sources: []
  })
}));

jest.mock('../../models/SuperChat.model', () => ({
  superChatBelongsToUser: jest.fn().mockResolvedValue(true),
  getSuperChatMessages: jest.fn().mockResolvedValue([]),
  addSuperChatMessage: jest.fn()
}));

import { createCompletion, isLLMAvailable } from '../../config/llm';
import * as tariffService from '../tariff.service';
import * as llmService from '../llm.service';

describe('LLM Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('queryWithContext', () => {
    it('should send query with merged context', async () => {
      (createCompletion as jest.Mock).mockResolvedValue({
        content: 'AI response',
        tokensUsed: { prompt: 50, completion: 30, total: 80 },
        model: 'gpt-4',
        finishReason: 'stop'
      });

      const result = await llmService.queryWithContext(
        'sc-1',
        'What is machine learning?',
        'user-1'
      );

      expect(result.response).toBe('AI response');
      expect(result.tokensUsed.total).toBe(80);
      expect(result.sources).toHaveLength(1);
      expect(result.quotaRemaining).toBe(10);
    });

    it('should throw error when LLM is unavailable', async () => {
      (isLLMAvailable as jest.Mock).mockReturnValueOnce(false);

      await expect(
        llmService.queryWithContext('sc-1', 'Question', 'user-1')
      ).rejects.toThrow('Сервис ИИ временно недоступен');
    });

    it('should throw error when quota is exhausted', async () => {
      (tariffService.checkAndDecrementQuota as jest.Mock).mockResolvedValueOnce({
        success: false,
        remaining: 0,
        plan: 'free'
      });

      await expect(
        llmService.queryWithContext('sc-1', 'Question', 'user-1')
      ).rejects.toThrow('Лимит запросов исчерпан');
    });

    it('should refund quota on error', async () => {
      (createCompletion as jest.Mock).mockRejectedValueOnce(new Error('API error'));

      await expect(
        llmService.queryWithContext('sc-1', 'Question', 'user-1')
      ).rejects.toThrow('API error');

      expect(tariffService.refundQuota).toHaveBeenCalledWith('user-1');
    });

    it('should check super-chat ownership', async () => {
      const { superChatBelongsToUser } = require('../../models/SuperChat.model');
      superChatBelongsToUser.mockResolvedValueOnce(false);

      await expect(
        llmService.queryWithContext('sc-1', 'Question', 'user-1')
      ).rejects.toThrow('Супер-чат не найден');
    });
  });

  describe('generateDailyDigest', () => {
    it('should generate digest from super-chat activity', async () => {
      (createCompletion as jest.Mock).mockResolvedValue({
        content: 'Daily digest content',
        tokensUsed: { prompt: 100, completion: 50, total: 150 }
      });

      const result = await llmService.generateDailyDigest('sc-1', 'user-1');

      expect(result).toBe('Daily digest content');
      expect(createCompletion).toHaveBeenCalled();
    });

    it('should throw error when LLM is unavailable', async () => {
      (isLLMAvailable as jest.Mock).mockReturnValueOnce(false);

      await expect(
        llmService.generateDailyDigest('sc-1', 'user-1')
      ).rejects.toThrow('Сервис ИИ недоступен');
    });
  });
});
