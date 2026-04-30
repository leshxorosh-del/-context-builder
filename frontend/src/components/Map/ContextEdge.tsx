import { memo } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import clsx from 'clsx';

interface ContextEdgeData {
  linkId: string;
  selectedMessageCount: number;
  totalMessageCount: number;
}

/**
 * Custom edge for context links
 */
function ContextEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<ContextEdgeData>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const hasSelection = data?.selectedMessageCount && data.selectedMessageCount > 0;

  return (
    <>
      {/* Main path */}
      <path
        id={id}
        className={clsx(
          'react-flow__edge-path transition-all',
          selected && 'stroke-primary-500'
        )}
        d={edgePath}
        strokeWidth={selected ? 3 : 2}
        stroke={hasSelection ? '#22c55e' : '#9ca3af'}
        fill="none"
        strokeDasharray={hasSelection ? undefined : '5,5'}
      />

      {/* Animated flow indicator */}
      {hasSelection && (
        <path
          d={edgePath}
          strokeWidth={2}
          stroke="#22c55e"
          fill="none"
          strokeDasharray="10,10"
          style={{
            animation: 'dash 1s linear infinite',
          }}
        />
      )}

      {/* Label */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          {data && (
            <div
              className={clsx(
                'px-2 py-1 rounded-full text-xs font-medium transition-colors',
                hasSelection
                  ? 'bg-success-100 text-success-700'
                  : 'bg-gray-100 text-gray-600',
                selected && 'ring-2 ring-primary-500'
              )}
            >
              {hasSelection
                ? `${data.selectedMessageCount} выбрано`
                : 'Нет выбора'}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>

      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -20;
          }
        }
      `}</style>
    </>
  );
}

export default memo(ContextEdge);
