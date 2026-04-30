import { logger } from '../config/logger';
import { HttpErrors } from '../middleware/errorHandler';
import { runQuery, NodeLabels, RelationshipTypes } from '../config/neo4j';
import * as SuperChatModel from '../models/SuperChat.model';
import * as ChatModel from '../models/Chat.model';
import * as MessageModel from '../models/Message.model';
import { mergeContexts, ContextSource } from '../utils/contextMerger';

/**
 * Graph node for visualization
 */
export interface GraphNode {
  id: string;
  type: 'chat' | 'super_chat';
  title: string;
  position: { x: number; y: number };
  data: {
    messageCount?: number;
    selectedCount?: number;
    sourceCount?: number;
    color?: string;
  };
}

/**
 * Graph edge for visualization
 */
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  data: {
    linkId: string;
    selectedMessageCount: number;
    totalMessageCount: number;
  };
}

/**
 * Full project map
 */
export interface ProjectMap {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Create a new super-chat
 */
export async function createSuperChat(
  userId: string,
  title: string,
  options?: { position_x?: number; position_y?: number; color?: string }
): Promise<SuperChatModel.ISuperChat> {
  const superChat = await SuperChatModel.createSuperChat(userId, title, options);
  
  logger.info('Super-chat created', { superChatId: superChat.id, userId, title });
  
  return superChat;
}

/**
 * Get super-chat with details
 */
export async function getSuperChatDetails(
  superChatId: string,
  userId: string
): Promise<{
  superChat: SuperChatModel.ISuperChatWithStats;
  links: SuperChatModel.IContextLinkWithDetails[];
  messages: SuperChatModel.ISuperChatMessage[];
}> {
  // Verify ownership
  const belongs = await SuperChatModel.superChatBelongsToUser(superChatId, userId);
  if (!belongs) {
    throw HttpErrors.NotFound('Супер-чат не найден', 'SUPER_CHAT_NOT_FOUND');
  }

  const [superChat, links, messages] = await Promise.all([
    SuperChatModel.getSuperChatWithStats(superChatId),
    SuperChatModel.getLinksForSuperChat(superChatId),
    SuperChatModel.getSuperChatMessages(superChatId)
  ]);

  if (!superChat) {
    throw HttpErrors.NotFound('Супер-чат не найден', 'SUPER_CHAT_NOT_FOUND');
  }

  return { superChat, links, messages };
}

/**
 * Link a chat to a super-chat
 */
export async function linkChatToSuperChat(
  superChatId: string,
  sourceChatId: string,
  userId: string
): Promise<SuperChatModel.IContextLink> {
  // Verify super-chat ownership
  const superChatBelongs = await SuperChatModel.superChatBelongsToUser(superChatId, userId);
  if (!superChatBelongs) {
    throw HttpErrors.NotFound('Супер-чат не найден', 'SUPER_CHAT_NOT_FOUND');
  }

  // Verify chat ownership
  const chatBelongs = await ChatModel.chatBelongsToUser(sourceChatId, userId);
  if (!chatBelongs) {
    throw HttpErrors.NotFound('Чат не найден', 'CHAT_NOT_FOUND');
  }

  try {
    const link = await SuperChatModel.linkChatToSuperChat(superChatId, sourceChatId);
    logger.info('Chat linked to super-chat', { superChatId, sourceChatId, linkId: link.id });
    return link;
  } catch (error) {
    if (error instanceof Error && error.message.includes('unique')) {
      throw HttpErrors.Conflict('Связь уже существует', 'LINK_EXISTS');
    }
    throw error;
  }
}

/**
 * Unlink a source from a super-chat
 */
export async function unlinkFromSuperChat(
  linkId: string,
  userId: string
): Promise<void> {
  const link = await SuperChatModel.getLinkById(linkId);
  if (!link) {
    throw HttpErrors.NotFound('Связь не найдена', 'LINK_NOT_FOUND');
  }

  // Verify ownership through super-chat
  const belongs = await SuperChatModel.superChatBelongsToUser(link.super_chat_id, userId);
  if (!belongs) {
    throw HttpErrors.NotFound('Связь не найдена', 'LINK_NOT_FOUND');
  }

  await SuperChatModel.unlinkFromSuperChat(linkId);
  logger.info('Link removed', { linkId, superChatId: link.super_chat_id });
}

/**
 * Update selected messages for a link
 */
export async function updateLinkMessages(
  linkId: string,
  messageIds: string[],
  userId: string
): Promise<void> {
  const link = await SuperChatModel.getLinkById(linkId);
  if (!link) {
    throw HttpErrors.NotFound('Связь не найдена', 'LINK_NOT_FOUND');
  }

  // Verify ownership
  const belongs = await SuperChatModel.superChatBelongsToUser(link.super_chat_id, userId);
  if (!belongs) {
    throw HttpErrors.NotFound('Связь не найдена', 'LINK_NOT_FOUND');
  }

  await SuperChatModel.setSelectedMessagesForLink(linkId, messageIds);
  logger.debug('Link messages updated', { linkId, messageCount: messageIds.length });
}

/**
 * Get the full project map for visualization
 */
export async function getFullProjectMap(userId: string): Promise<ProjectMap> {
  const [chats, superChats] = await Promise.all([
    ChatModel.getChatsByUser(userId),
    SuperChatModel.getSuperChatsByUser(userId)
  ]);

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Add chat nodes
  for (const chat of chats) {
    nodes.push({
      id: chat.id,
      type: 'chat',
      title: chat.title || 'Без названия',
      position: { x: chat.position_x, y: chat.position_y },
      data: {
        messageCount: chat.message_count,
        selectedCount: chat.selected_count
      }
    });
  }

  // Add super-chat nodes and their edges
  for (const superChat of superChats) {
    nodes.push({
      id: superChat.id,
      type: 'super_chat',
      title: superChat.title,
      position: { x: superChat.position_x, y: superChat.position_y },
      data: {
        sourceCount: superChat.source_count,
        messageCount: superChat.message_count,
        color: superChat.color
      }
    });

    // Get links for this super-chat
    const links = await SuperChatModel.getLinksForSuperChat(superChat.id);
    for (const link of links) {
      const sourceId = link.source_chat_id || link.source_super_chat_id;
      if (sourceId) {
        edges.push({
          id: link.id,
          source: sourceId,
          target: superChat.id,
          data: {
            linkId: link.id,
            selectedMessageCount: link.selected_message_count,
            totalMessageCount: link.total_message_count
          }
        });
      }
    }
  }

  return { nodes, edges };
}

/**
 * Get graph data from Neo4j for a super-chat
 */
export async function getSuperChatGraph(superChatId: string): Promise<{
  nodes: Array<{ id: string; type: string; title: string }>;
  edges: Array<{ source: string; target: string; linkId: string }>;
}> {
  const result = await runQuery(`
    MATCH (sc:${NodeLabels.SUPER_CHAT} {id: $superChatId})
    OPTIONAL MATCH (sc)-[r:${RelationshipTypes.INCLUDES}]->(related)
    RETURN sc, collect({
      relatedId: related.id,
      relatedTitle: related.title,
      relatedType: labels(related)[0],
      linkId: r.linkId
    }) as connections
  `, { superChatId });

  if (result.records.length === 0) {
    return { nodes: [], edges: [] };
  }

  const record = result.records[0];
  const sc = record.get('sc');
  const connections = record.get('connections') as Array<{
    relatedId: string;
    relatedTitle: string;
    relatedType: string;
    linkId: string;
  }>;

  const nodes = [{
    id: sc.properties.id,
    type: 'super_chat',
    title: sc.properties.title
  }];

  const edges: Array<{ source: string; target: string; linkId: string }> = [];

  for (const conn of connections) {
    if (conn.relatedId) {
      nodes.push({
        id: conn.relatedId,
        type: conn.relatedType === 'SuperChat' ? 'super_chat' : 'chat',
        title: conn.relatedTitle || 'Без названия'
      });
      edges.push({
        source: conn.relatedId,
        target: superChatId,
        linkId: conn.linkId
      });
    }
  }

  return { nodes, edges };
}

/**
 * Build context payload for LLM query
 */
export async function buildContextPayload(
  superChatId: string
): Promise<{
  context: ReturnType<typeof mergeContexts>;
  sources: ContextSource[];
}> {
  const links = await SuperChatModel.getLinksForSuperChat(superChatId);
  const sources: ContextSource[] = [];

  for (const link of links) {
    if (link.link_type === 'chat' && link.source_chat_id) {
      const chat = await ChatModel.getChatById(link.source_chat_id);
      if (!chat) continue;

      // Get selected messages for this link, or all messages if none selected
      const selectedIds = await SuperChatModel.getSelectedMessagesForLink(link.id);
      
      let messages: MessageModel.IMessage[];
      if (selectedIds.length > 0) {
        // Get only selected messages
        const allMessages = await MessageModel.getMessagesByChat(link.source_chat_id);
        messages = allMessages.filter(m => selectedIds.includes(m.id));
      } else {
        // Get latest messages
        messages = await MessageModel.getLatestMessages(link.source_chat_id, 50);
      }

      sources.push({
        chatId: chat.id,
        chatTitle: chat.title || 'Без названия',
        messages: messages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          created_at: m.created_at
        })),
        isSelectedOnly: selectedIds.length > 0
      });
    }
    // TODO: Handle super_chat link type (recursive context)
  }

  const context = mergeContexts(sources);

  return { context, sources };
}

/**
 * Delete super-chat
 */
export async function deleteSuperChat(
  superChatId: string,
  userId: string
): Promise<void> {
  const belongs = await SuperChatModel.superChatBelongsToUser(superChatId, userId);
  if (!belongs) {
    throw HttpErrors.NotFound('Супер-чат не найден', 'SUPER_CHAT_NOT_FOUND');
  }

  await SuperChatModel.deleteSuperChat(superChatId);
  logger.info('Super-chat deleted', { superChatId, userId });
}

/**
 * Update super-chat
 */
export async function updateSuperChat(
  superChatId: string,
  userId: string,
  data: Partial<Pick<SuperChatModel.ISuperChat, 'title' | 'position_x' | 'position_y' | 'description' | 'color'>>
): Promise<SuperChatModel.ISuperChat> {
  const belongs = await SuperChatModel.superChatBelongsToUser(superChatId, userId);
  if (!belongs) {
    throw HttpErrors.NotFound('Супер-чат не найден', 'SUPER_CHAT_NOT_FOUND');
  }

  const updated = await SuperChatModel.updateSuperChat(superChatId, data);
  if (!updated) {
    throw HttpErrors.InternalError('Не удалось обновить супер-чат');
  }

  return updated;
}

export default {
  createSuperChat,
  getSuperChatDetails,
  linkChatToSuperChat,
  unlinkFromSuperChat,
  updateLinkMessages,
  getFullProjectMap,
  getSuperChatGraph,
  buildContextPayload,
  deleteSuperChat,
  updateSuperChat
};
