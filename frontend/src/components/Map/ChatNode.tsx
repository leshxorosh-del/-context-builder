import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ChatBubbleLeftRightIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface ChatNodeData {
  title: string;
  messageCount: number;
  selectedCount: number;
}

/**
 * Custom node for regular chats
 */
function ChatNode({ data, selected }: NodeProps<ChatNodeData>) {
  const hasSelection = data.selectedCount > 0;

  return (
    <div
      className={clsx(
        'bg-white rounded-lg border-2 shadow-md min-w-[180px] transition-all',
        selected ? 'border-primary-500 shadow-lg' : 'border-blue-200 hover:border-blue-300'
      )}
    >
      {/* Source handle (output) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-blue-500 !w-3 !h-3"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-t-md border-b border-blue-100">
        <ChatBubbleLeftRightIcon className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-medium text-gray-900 truncate max-w-[140px]">
          {data.title || 'Без названия'}
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{data.messageCount} сообщений</span>
          {hasSelection && (
            <span className="flex items-center gap-1 text-success-600">
              <CheckCircleIcon className="w-3 h-3" />
              {data.selectedCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ChatNode);
