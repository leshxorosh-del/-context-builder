import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { SparklesIcon, LinkIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

interface SuperChatNodeData {
  title: string;
  sourceCount: number;
  messageCount: number;
  color: string;
}

/**
 * Custom node for super-chats (aggregated context)
 */
function SuperChatNode({ id, data, selected }: NodeProps<SuperChatNodeData>) {
  const navigate = useNavigate();

  const handleDoubleClick = () => {
    navigate(`/super-chat/${id}`);
  };

  return (
    <div
      className={clsx(
        'bg-white rounded-xl border-2 shadow-md min-w-[200px] transition-all cursor-pointer',
        selected ? 'border-accent-500 shadow-xl scale-105' : 'border-violet-200 hover:border-violet-300'
      )}
      onDoubleClick={handleDoubleClick}
    >
      {/* Target handle (input) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-violet-500 !w-3 !h-3"
      />

      {/* Source handle (for chaining super-chats) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-violet-500 !w-3 !h-3"
      />

      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-t-lg border-b"
        style={{ 
          backgroundColor: `${data.color}15`,
          borderColor: `${data.color}30`
        }}
      >
        <SparklesIcon className="w-5 h-5" style={{ color: data.color }} />
        <span className="text-sm font-semibold text-gray-900 truncate max-w-[160px]">
          {data.title}
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-2 space-y-1">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <LinkIcon className="w-3 h-3" />
          <span>{data.sourceCount} источников</span>
        </div>
        <div className="text-xs text-gray-400">
          {data.messageCount} сообщений
        </div>
      </div>

      {/* Footer hint */}
      <div className="px-3 py-1.5 bg-gray-50 rounded-b-lg border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">
          Двойной клик для открытия
        </p>
      </div>
    </div>
  );
}

export default memo(SuperChatNode);
