import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PaperAirplaneIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useContextStore } from '@store/contextStore';
import { useTariffStore } from '@store/tariffStore';
import Button from '@components/common/Button';
import clsx from 'clsx';
import toast from 'react-hot-toast';

/**
 * Super-chat conversation page
 */
export default function SuperChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    superChat,
    links,
    messages,
    isLoading,
    isQuerying,
    loadSuperChat,
    sendQuery,
    clearContext,
  } = useContextStore();
  
  const { status, decrementQuota } = useTariffStore();
  const [inputValue, setInputValue] = useState('');

  // Load super-chat on mount
  useEffect(() => {
    if (id) {
      loadSuperChat(id);
    }
    return () => clearContext();
  }, [id, loadSuperChat, clearContext]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle send message
  const handleSend = async () => {
    if (!inputValue.trim() || isQuerying) return;

    const message = inputValue.trim();
    setInputValue('');

    try {
      const result = await sendQuery(message);
      decrementQuota();
      
      if (result.quotaRemaining <= 5) {
        toast('Осталось мало запросов', { icon: '⚠️' });
      }
    } catch (error) {
      toast.error('Не удалось отправить запрос');
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!superChat) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Супер-чат не найден</p>
          <Button onClick={() => navigate('/map')}>
            Вернуться к карте
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-3 flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/map')}
          leftIcon={<ArrowLeftIcon className="w-4 h-4" />}
        >
          Карта
        </Button>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-accent-500" />
            <h1 className="font-semibold text-gray-900">{superChat.title}</h1>
          </div>
          <p className="text-sm text-gray-500">
            {links.length} источник{links.length === 1 ? '' : links.length < 5 ? 'а' : 'ов'}
            {links.length > 0 && (
              <span className="ml-2">
                ({links.map(l => l.source_title).join(', ')})
              </span>
            )}
          </p>
        </div>

        {/* Quota indicator */}
        {status && (
          <div className={clsx(
            'px-3 py-1 rounded-full text-sm font-medium',
            status.queriesRemaining > 20
              ? 'bg-success-50 text-success-600'
              : status.queriesRemaining > 5
              ? 'bg-warning-50 text-warning-600'
              : 'bg-error-50 text-error-600'
          )}>
            {status.plan === 'yearly' ? '∞' : status.queriesRemaining} запросов
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <SparklesIcon className="w-12 h-12 text-accent-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Начните диалог
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Задайте вопрос, и я отвечу на основе контекста из связанных чатов.
              Информация из всех источников будет учтена при формировании ответа.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={clsx(
                'flex',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={clsx(
                  'max-w-[80%] rounded-2xl px-4 py-3',
                  message.role === 'user'
                    ? 'bg-primary-600 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-900 rounded-bl-md'
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.context_sources && message.context_sources.length > 0 && (
                  <p className="text-xs mt-2 opacity-70">
                    На основе {message.context_sources.length} источников
                  </p>
                )}
              </div>
            </div>
          ))
        )}
        
        {/* Loading indicator */}
        {isQuerying && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="flex gap-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Задайте вопрос..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            disabled={isQuerying || (status?.queriesRemaining === 0 && status?.plan !== 'yearly')}
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isQuerying || (status?.queriesRemaining === 0 && status?.plan !== 'yearly')}
            isLoading={isQuerying}
            className="px-4"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </Button>
        </div>
        
        {status?.queriesRemaining === 0 && status?.plan !== 'yearly' && (
          <p className="text-sm text-error-600 mt-2">
            Лимит запросов исчерпан.{' '}
            <button
              onClick={() => navigate('/tariffs')}
              className="underline hover:no-underline"
            >
              Пополнить тариф
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
