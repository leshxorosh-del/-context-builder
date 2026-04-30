import { create } from 'zustand';
import { Node, Edge, Connection, addEdge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from 'reactflow';
import { superChatsApi, chatsApi } from '@services/api';

/**
 * Node data for chats
 */
export interface ChatNodeData {
  title: string;
  messageCount: number;
  selectedCount: number;
}

/**
 * Node data for super-chats
 */
export interface SuperChatNodeData {
  title: string;
  sourceCount: number;
  messageCount: number;
  color: string;
}

/**
 * Edge data
 */
export interface ContextEdgeData {
  linkId: string;
  selectedMessageCount: number;
  totalMessageCount: number;
}

/**
 * Map store state
 */
interface MapState {
  nodes: Node[];
  edges: Edge[];
  isLoading: boolean;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
}

/**
 * Map store actions
 */
interface MapActions {
  loadMap: () => Promise<void>;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => Promise<void>;
  addChatNode: (title?: string) => Promise<Node>;
  addSuperChatNode: (title: string) => Promise<Node>;
  removeNode: (nodeId: string) => Promise<void>;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  removeEdge: (edgeId: string) => Promise<void>;
}

/**
 * Map store
 */
export const useMapStore = create<MapState & MapActions>((set, get) => ({
  // State
  nodes: [],
  edges: [],
  isLoading: false,
  selectedNodeId: null,
  selectedEdgeId: null,

  // Actions
  loadMap: async () => {
    set({ isLoading: true });
    try {
      const response = await superChatsApi.getProjectMap();
      const { nodes: apiNodes, edges: apiEdges } = response.data;

      // Transform API nodes to ReactFlow nodes
      const nodes: Node[] = apiNodes.map((node: {
        id: string;
        type: 'chat' | 'super_chat';
        title: string;
        position: { x: number; y: number };
        data: ChatNodeData | SuperChatNodeData;
      }) => ({
        id: node.id,
        type: node.type === 'super_chat' ? 'superChat' : 'chat',
        position: node.position,
        data: {
          ...node.data,
          title: node.title,
        },
      }));

      // Transform API edges to ReactFlow edges
      const edges: Edge[] = apiEdges.map((edge: {
        id: string;
        source: string;
        target: string;
        data: ContextEdgeData;
      }) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'contextEdge',
        data: edge.data,
        animated: true,
      }));

      set({ nodes, edges, isLoading: false });
    } catch (error) {
      console.error('Failed to load map:', error);
      set({ isLoading: false });
    }
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: async (connection) => {
    if (!connection.source || !connection.target) return;

    // Find target node - must be a super-chat
    const targetNode = get().nodes.find(n => n.id === connection.target);
    if (!targetNode || targetNode.type !== 'superChat') {
      console.warn('Can only connect to super-chats');
      return;
    }

    try {
      const response = await superChatsApi.addLink(connection.target, {
        sourceChatId: connection.source,
      });

      const newEdge: Edge = {
        id: response.data.link.id,
        source: connection.source,
        target: connection.target,
        type: 'contextEdge',
        data: {
          linkId: response.data.link.id,
          selectedMessageCount: 0,
          totalMessageCount: 0,
        },
        animated: true,
      };

      set({ edges: addEdge(newEdge, get().edges) });
    } catch (error) {
      console.error('Failed to create link:', error);
    }
  },

  addChatNode: async (title?: string) => {
    const response = await chatsApi.create({ title });
    const chat = response.data.chat;

    const newNode: Node = {
      id: chat.id,
      type: 'chat',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        title: chat.title || 'Новый чат',
        messageCount: 0,
        selectedCount: 0,
      },
    };

    set({ nodes: [...get().nodes, newNode] });
    return newNode;
  },

  addSuperChatNode: async (title: string) => {
    const response = await superChatsApi.create({
      title,
      position_x: Math.random() * 400,
      position_y: Math.random() * 400,
    });
    const superChat = response.data.superChat;

    const newNode: Node = {
      id: superChat.id,
      type: 'superChat',
      position: { x: superChat.position_x, y: superChat.position_y },
      data: {
        title: superChat.title,
        sourceCount: 0,
        messageCount: 0,
        color: superChat.color,
      },
    };

    set({ nodes: [...get().nodes, newNode] });
    return newNode;
  },

  removeNode: async (nodeId: string) => {
    const node = get().nodes.find(n => n.id === nodeId);
    if (!node) return;

    try {
      if (node.type === 'superChat') {
        await superChatsApi.delete(nodeId);
      } else {
        await chatsApi.delete(nodeId);
      }

      set({
        nodes: get().nodes.filter(n => n.id !== nodeId),
        edges: get().edges.filter(e => e.source !== nodeId && e.target !== nodeId),
        selectedNodeId: get().selectedNodeId === nodeId ? null : get().selectedNodeId,
      });
    } catch (error) {
      console.error('Failed to delete node:', error);
    }
  },

  updateNodePosition: (nodeId, position) => {
    set({
      nodes: get().nodes.map(node =>
        node.id === nodeId ? { ...node, position } : node
      ),
    });

    // Debounced API call would go here
    const node = get().nodes.find(n => n.id === nodeId);
    if (node?.type === 'superChat') {
      superChatsApi.update(nodeId, { position_x: position.x, position_y: position.y })
        .catch(console.error);
    } else if (node) {
      chatsApi.update(nodeId, { position_x: position.x, position_y: position.y })
        .catch(console.error);
    }
  },

  selectNode: (nodeId) => {
    set({ selectedNodeId: nodeId, selectedEdgeId: null });
  },

  selectEdge: (edgeId) => {
    set({ selectedEdgeId: edgeId, selectedNodeId: null });
  },

  removeEdge: async (edgeId: string) => {
    const edge = get().edges.find(e => e.id === edgeId);
    if (!edge) return;

    try {
      await superChatsApi.removeLink(edge.target, edgeId);
      set({
        edges: get().edges.filter(e => e.id !== edgeId),
        selectedEdgeId: null,
      });
    } catch (error) {
      console.error('Failed to remove edge:', error);
    }
  },
}));

export default useMapStore;
