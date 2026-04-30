import { useEffect, useCallback, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { PlusIcon, ChatBubbleLeftRightIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useMapStore } from '@store/mapStore';
import Button from '@components/common/Button';
import ChatNode from '@components/Map/ChatNode';
import SuperChatNode from '@components/Map/SuperChatNode';
import ContextEdge from '@components/Map/ContextEdge';
import CreateSuperChatModal from '@components/Map/CreateSuperChatModal';
import ChatDetailPanel from '@components/Context/ChatDetailPanel';

// Register custom node types
const nodeTypes = {
  chat: ChatNode,
  superChat: SuperChatNode,
};

// Register custom edge types
const edgeTypes = {
  contextEdge: ContextEdge,
};

/**
 * Main project map page with visual graph editor
 */
export default function ProjectMapPage() {
  const {
    nodes,
    edges,
    isLoading,
    selectedNodeId,
    loadMap,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addChatNode,
    addSuperChatNode,
    selectNode,
    updateNodePosition,
  } = useMapStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { fitView } = useReactFlow();

  // Load map on mount
  useEffect(() => {
    loadMap();
  }, [loadMap]);

  // Fit view after loading
  useEffect(() => {
    if (!isLoading && nodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.2 }), 100);
    }
  }, [isLoading, nodes.length, fitView]);

  // Handle node click
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: { id: string }) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  // Handle node drag stop
  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: { id: string; position: { x: number; y: number } }) => {
      updateNodePosition(node.id, node.position);
    },
    [updateNodePosition]
  );

  // Handle pane click (deselect)
  const handlePaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // Handle creating a new chat
  const handleAddChat = async () => {
    await addChatNode();
  };

  // Handle creating a new super-chat
  const handleCreateSuperChat = async (title: string) => {
    await addSuperChatNode(title);
    setIsCreateModalOpen(false);
  };

  return (
    <div className="flex-1 flex relative">
      {/* Main canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          onNodeDragStop={handleNodeDragStop}
          onPaneClick={handlePaneClick}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          minZoom={0.2}
          maxZoom={2}
          defaultEdgeOptions={{
            type: 'contextEdge',
            animated: true,
          }}
        >
          <Background color="#e5e7eb" gap={20} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(node) =>
              node.type === 'superChat' ? '#8b5cf6' : '#3b82f6'
            }
            maskColor="rgba(255, 255, 255, 0.8)"
          />

          {/* Toolbar */}
          <Panel position="top-left" className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ChatBubbleLeftRightIcon className="w-4 h-4" />}
              onClick={handleAddChat}
            >
              Новый чат
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<SparklesIcon className="w-4 h-4" />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Новый супер-чат
            </Button>
          </Panel>

          {/* Empty state */}
          {!isLoading && nodes.length === 0 && (
            <Panel position="top-center" className="mt-20">
              <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
                  <PlusIcon className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Карта проекта пуста
                </h3>
                <p className="text-gray-600 mb-4">
                  Создайте первый чат или супер-чат, чтобы начать работу с контекстом
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="secondary"
                    onClick={handleAddChat}
                    leftIcon={<ChatBubbleLeftRightIcon className="w-4 h-4" />}
                  >
                    Создать чат
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setIsCreateModalOpen(true)}
                    leftIcon={<SparklesIcon className="w-4 h-4" />}
                  >
                    Создать супер-чат
                  </Button>
                </div>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>

      {/* Side panel for selected node */}
      {selectedNodeId && (
        <ChatDetailPanel
          nodeId={selectedNodeId}
          onClose={() => selectNode(null)}
        />
      )}

      {/* Create super-chat modal */}
      <CreateSuperChatModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateSuperChat}
      />
    </div>
  );
}
