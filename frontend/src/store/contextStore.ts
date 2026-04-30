import { create } from 'zustand';
import { superChatsApi } from '@services/api';

/**
 * Message interface
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  context_sources?: string[];
}

/**
 * Link interface
 */
export interface ContextLink {
  id: string;
  super_chat_id: string;
  source_chat_id: string | null;
  source_super_chat_id: string | null;
  link_type: 'chat' | 'super_chat';
  source_title: string;
  selected_message_count: number;
  total_message_count: number;
}

/**
 * Super-chat details
 */
export interface SuperChatDetails {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  color: string;
  source_count: number;
  message_count: number;
}

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
 * Context store state
 */
interface ContextState {
  activeSuperChatId: string | null;
  superChat: SuperChatDetails | null;
  links: ContextLink[];
  messages: Message[];
  isLoading: boolean;
  isQuerying: boolean;
}

/**
 * Context store actions
 */
interface ContextActions {
  loadSuperChat: (id: string) => Promise<void>;
  sendQuery: (message: string) => Promise<QueryResult>;
  clearContext: () => void;
  addMessage: (message: Message) => void;
  setLinks: (links: ContextLink[]) => void;
}

/**
 * Context store
 */
export const useContextStore = create<ContextState & ContextActions>((set, get) => ({
  // State
  activeSuperChatId: null,
  superChat: null,
  links: [],
  messages: [],
  isLoading: false,
  isQuerying: false,

  // Actions
  loadSuperChat: async (id: string) => {
    set({ isLoading: true, activeSuperChatId: id });
    try {
      const response = await superChatsApi.get(id);
      const { superChat, links, messages } = response.data;
      set({
        superChat,
        links,
        messages,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load super-chat:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  sendQuery: async (message: string) => {
    const { activeSuperChatId, messages } = get();
    if (!activeSuperChatId) throw new Error('No active super-chat');

    // Optimistically add user message
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    };
    set({ messages: [...messages, userMessage], isQuerying: true });

    try {
      const response = await superChatsApi.query(activeSuperChatId, message);
      const result: QueryResult = response.data;

      // Add assistant response
      const assistantMessage: Message = {
        id: `resp-${Date.now()}`,
        role: 'assistant',
        content: result.response,
        created_at: new Date().toISOString(),
        context_sources: result.sources.map(s => s.chatId),
      };

      set({
        messages: [...get().messages, assistantMessage],
        isQuerying: false,
      });

      return result;
    } catch (error) {
      // Remove optimistic message on error
      set({
        messages: get().messages.filter(m => m.id !== userMessage.id),
        isQuerying: false,
      });
      throw error;
    }
  },

  clearContext: () => {
    set({
      activeSuperChatId: null,
      superChat: null,
      links: [],
      messages: [],
    });
  },

  addMessage: (message: Message) => {
    set({ messages: [...get().messages, message] });
  },

  setLinks: (links: ContextLink[]) => {
    set({ links });
  },
}));

export default useContextStore;
