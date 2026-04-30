import { useState, useEffect } from 'react';
import { XMarkIcon, CheckIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { chatsApi } from '@services/api';
import { useMapStore } from '@store/mapStore';
import Button from '@components/common/Button';
import clsx from 'clsx';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  is_selected: boolean;
  created_at: string;
}

interface ChatDetailPanelProps {
  nodeId: string;
  onClose: () => void;
}

/**
 * Side panel showing chat details and message selection
 */
export default function ChatDetailPanel({ nodeId, onClose }: ChatDetailPanelProps) {
  const { nodes } = useMapStore();
  const node = nodes.find(n => n.id === nodeId);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ selectedCount: 0, tokenCount: 0 });

  // Check if this is a super-chat
  const isSuperChat = node?.type === 'superChat';

  useEffect(() => {
    if (!isSuperChat) {
      loadChat();
    }
  }, [nodeId, isSuperChat]);

  const loadChat = async () => {
    setIsLoading(true);
    try {
      const response = await chatsApi.get(nodeId);
      setMessages(response.data.messages);
      
      const selectedResponse = await chatsApi.getSelected(nodeId);
      setStats({
        selectedCount: selectedResponse.data.stats.selectedCount,
        tokenCount: selectedResponse.data.stats.tokenCount,
      });
    } catch (error) {
      console.error('Failed to load chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSelection = async (messageId: string) => {
    try {
      const response = await chatsApi.toggleSelection(nodeId, messageId);
      const updated = response.data.data;
      
      setMessages(msgs =>
        msgs.map(m => (m.id === messageId ? { ...m, is_selected: updated.is_selected } : m))
      );
      
      // Update stats
      const selectedResponse = await chatsApi.getSelected(nodeId);
      setStats({
        selectedCount: selectedResponse.data.stats.selectedCount,
        tokenCount: selectedResponse.data.stats.tokenCount,
      });
    } catch (error) {
      console.error('Failed to toggle selection:', error);
    }
  };

  const handleSelectAll = async () => {
    try {
      await chatsApi.selectAll(nodeId);
      setMessages(msgs => msgs.map(m => ({ ...m, is_selected: true })));
      loadChat();
    } catch (error) {
      console.error('Failed to select all:', error);
    }
  };

  const handleDeselectAll = async () => {
    try {
      await chatsApi.deselectAll(nodeId);
      setMessages(msgs => msgs.map(m => ({ ...m, is_selected: false })));
      loadChat();
    } catch (error) {
      console.error('Failed to deselect all:', error);
    }
  };

  // Filter messages by search
  const filteredMessages = messages.filter(m =>
    m.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isSuperChat) {
    return (
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col animate-slide-in">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Супер-чат</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-gray-500 text-center">
            Дважды кликните по узлу, чтобы открыть супер-чат
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col animate-slide-in">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900 truncate">
            {node?.data?.title || 'Чат'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500">
          Выбрано: {stats.selectedCount} сообщений (~{stats.tokenCount} токенов)
        </p>
      </div>

      {/* Search & Actions */}
      <div className="p-4 border-b border-gray-200 space-y-3">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск сообщений..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleSelectAll} className="flex-1">
            Выбрать все
          </Button>
          <Button size="sm" variant="outline" onClick={handleDeselectAll} className="flex-1">
            Снять все
          </Button>
        </div>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
          </div>
        ) : filteredMessages.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            {searchQuery ? 'Ничего не найдено' : 'Нет сообщений'}
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredMessages.map((message) => (
              <div
                key={message.id}
                onClick={() => handleToggleSelection(message.id)}
                className={clsx(
                  'p-3 cursor-pointer transition-colors',
                  message.is_selected ? 'bg-primary-50' : 'hover:bg-gray-50'
                )}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={clsx(
                      'w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center mt-0.5',
                      message.is_selected
                        ? 'bg-primary-500 border-primary-500'
                        : 'border-gray-300'
                    )}
                  >
                    {message.is_selected && (
                      <CheckIcon className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={clsx(
                          'text-xs font-medium px-1.5 py-0.5 rounded',
                          message.role === 'user'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        )}
                      >
                        {message.role === 'user' ? 'Вы' : 'ИИ'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-3">
                      {message.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
