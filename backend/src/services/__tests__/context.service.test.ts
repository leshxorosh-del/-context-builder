/**
 * Context Service Tests
 */

jest.mock('../../config/database', () => ({
  query: jest.fn(),
  withTransaction: jest.fn((fn) => fn({
    query: jest.fn()
  }))
}));

jest.mock('../../config/neo4j', () => ({
  runQuery: jest.fn(),
  NodeLabels: {
    CHAT: 'Chat',
    SUPER_CHAT: 'SuperChat',
    USER: 'User'
  },
  RelationshipTypes: {
    INCLUDES: 'INCLUDES',
    OWNS: 'OWNS',
    LINKED_TO: 'LINKED_TO'
  }
}));

jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

import { query, withTransaction } from '../../config/database';
import { runQuery } from '../../config/neo4j';
import * as contextService from '../context.service';

describe('Context Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSuperChat', () => {
    it('should create super-chat in PostgreSQL and Neo4j', async () => {
      const mockSuperChat = {
        id: 'sc-1',
        user_id: 'user-1',
        title: 'Test Super Chat',
        position_x: 100,
        position_y: 200,
        color: '#8B5CF6',
        created_at: new Date()
      };

      (withTransaction as jest.Mock).mockImplementation(async (fn) => {
        const client = {
          query: jest.fn().mockResolvedValue({ rows: [mockSuperChat] })
        };
        return fn(client);
      });

      (runQuery as jest.Mock).mockResolvedValue({ records: [] });

      const result = await contextService.createSuperChat('user-1', 'Test Super Chat');

      expect(result.title).toBe('Test Super Chat');
      expect(runQuery).toHaveBeenCalled();
    });
  });

  describe('linkChatToSuperChat', () => {
    it('should create link in PostgreSQL and Neo4j', async () => {
      const mockLink = {
        id: 'link-1',
        super_chat_id: 'sc-1',
        source_chat_id: 'chat-1',
        link_type: 'chat',
        created_at: new Date()
      };

      // superChatBelongsToUser
      (query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 'sc-1' }] });
      // chatBelongsToUser
      (query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 'chat-1' }] });

      (withTransaction as jest.Mock).mockImplementation(async (fn) => {
        const client = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [mockLink] })
            .mockResolvedValueOnce({ rows: [] })
        };
        return fn(client);
      });

      (runQuery as jest.Mock).mockResolvedValue({ records: [] });

      const result = await contextService.linkChatToSuperChat('sc-1', 'chat-1', 'user-1');

      expect(result.id).toBe('link-1');
      expect(result.source_chat_id).toBe('chat-1');
    });

    it('should throw error if super-chat not found', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(
        contextService.linkChatToSuperChat('invalid', 'chat-1', 'user-1')
      ).rejects.toThrow('Супер-чат не найден');
    });

    it('should throw error if chat not found', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'sc-1' }] }) // super-chat exists
        .mockResolvedValueOnce({ rows: [] }); // chat doesn't exist

      await expect(
        contextService.linkChatToSuperChat('sc-1', 'invalid', 'user-1')
      ).rejects.toThrow('Чат не найден');
    });
  });

  describe('getFullProjectMap', () => {
    it('should return nodes and edges for visualization', async () => {
      const mockChats = [
        {
          id: 'chat-1',
          user_id: 'user-1',
          title: 'Chat 1',
          position_x: 100,
          position_y: 100,
          message_count: 10,
          selected_count: 2
        }
      ];

      const mockSuperChats = [
        {
          id: 'sc-1',
          user_id: 'user-1',
          title: 'Super Chat 1',
          position_x: 300,
          position_y: 300,
          source_count: 1,
          message_count: 5,
          color: '#8B5CF6'
        }
      ];

      const mockLinks = [
        {
          id: 'link-1',
          super_chat_id: 'sc-1',
          source_chat_id: 'chat-1',
          link_type: 'chat',
          source_title: 'Chat 1',
          selected_message_count: 2,
          total_message_count: 10
        }
      ];

      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockChats }) // getChatsByUser
        .mockResolvedValueOnce({ rows: mockSuperChats }) // getSuperChatsByUser
        .mockResolvedValueOnce({ rows: mockLinks }); // getLinksForSuperChat

      const map = await contextService.getFullProjectMap('user-1');

      expect(map.nodes).toHaveLength(2);
      expect(map.edges).toHaveLength(1);

      const chatNode = map.nodes.find(n => n.id === 'chat-1');
      expect(chatNode?.type).toBe('chat');

      const superChatNode = map.nodes.find(n => n.id === 'sc-1');
      expect(superChatNode?.type).toBe('super_chat');

      expect(map.edges[0].source).toBe('chat-1');
      expect(map.edges[0].target).toBe('sc-1');
    });

    it('should return empty map for user with no chats', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const map = await contextService.getFullProjectMap('user-1');

      expect(map.nodes).toHaveLength(0);
      expect(map.edges).toHaveLength(0);
    });
  });
});
