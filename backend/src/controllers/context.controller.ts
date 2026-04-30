import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import * as contextService from '../services/context.service';
import * as llmService from '../services/llm.service';

/**
 * Create a new super-chat
 * POST /api/super-chats
 */
export const createSuperChat = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { title, position_x, position_y, color } = req.body as {
    title: string;
    position_x?: number;
    position_y?: number;
    color?: string;
  };

  const superChat = await contextService.createSuperChat(userId, title, {
    position_x,
    position_y,
    color
  });

  res.status(201).json({
    message: 'Супер-чат создан',
    superChat
  });
});

/**
 * Get super-chat details
 * GET /api/super-chats/:id
 */
export const getSuperChat = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;

  const result = await contextService.getSuperChatDetails(id, userId);

  res.json(result);
});

/**
 * Update super-chat
 * PATCH /api/super-chats/:id
 */
export const updateSuperChat = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;
  const { title, position_x, position_y, description, color } = req.body as {
    title?: string;
    position_x?: number;
    position_y?: number;
    description?: string;
    color?: string;
  };

  const superChat = await contextService.updateSuperChat(id, userId, {
    title,
    position_x,
    position_y,
    description,
    color
  });

  res.json({
    message: 'Супер-чат обновлён',
    superChat
  });
});

/**
 * Delete super-chat
 * DELETE /api/super-chats/:id
 */
export const deleteSuperChat = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;

  await contextService.deleteSuperChat(id, userId);

  res.json({
    message: 'Супер-чат удалён'
  });
});

/**
 * Get full project map
 * GET /api/project-map
 */
export const getProjectMap = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  const map = await contextService.getFullProjectMap(userId);

  res.json(map);
});

/**
 * Add link to super-chat
 * POST /api/super-chats/:id/link
 */
export const addLink = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;
  const { sourceChatId, linkType } = req.body as {
    sourceChatId: string;
    linkType?: 'chat' | 'super_chat';
  };

  const link = await contextService.linkChatToSuperChat(id, sourceChatId, userId);

  res.status(201).json({
    message: 'Связь создана',
    link
  });
});

/**
 * Remove link from super-chat
 * DELETE /api/super-chats/:id/links/:linkId
 */
export const removeLink = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { linkId } = req.params;

  await contextService.unlinkFromSuperChat(linkId, userId);

  res.json({
    message: 'Связь удалена'
  });
});

/**
 * Update selected messages for a link
 * PATCH /api/links/:linkId/messages
 */
export const updateLinkMessages = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { linkId } = req.params;
  const { messageIds } = req.body as { messageIds: string[] };

  await contextService.updateLinkMessages(linkId, messageIds, userId);

  res.json({
    message: 'Выбранные сообщения обновлены',
    selectedCount: messageIds.length
  });
});

/**
 * Send query to super-chat
 * POST /api/super-chats/:id/query
 */
export const querySuperchat = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;
  const { message } = req.body as { message: string };

  const result = await llmService.queryWithContext(id, message, userId);

  res.json({
    response: result.response,
    tokensUsed: result.tokensUsed,
    sources: result.sources,
    quotaRemaining: result.quotaRemaining
  });
});

/**
 * Stream query to super-chat
 * POST /api/super-chats/:id/query/stream
 */
export const streamQuerySuperchat = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;
  const { message } = req.body as { message: string };

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const result = await llmService.streamQueryWithContext(
      id,
      message,
      userId,
      (chunk) => {
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
      }
    );

    // Send final result
    res.write(`data: ${JSON.stringify({ 
      type: 'done', 
      tokensUsed: result.tokensUsed,
      sources: result.sources,
      quotaRemaining: result.quotaRemaining
    })}\n\n`);

  } catch (error) {
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    })}\n\n`);
  }

  res.end();
});

/**
 * Get super-chat graph (Neo4j visualization data)
 * GET /api/super-chats/:id/graph
 */
export const getSuperChatGraph = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const graph = await contextService.getSuperChatGraph(id);

  res.json(graph);
});

export default {
  createSuperChat,
  getSuperChat,
  updateSuperChat,
  deleteSuperChat,
  getProjectMap,
  addLink,
  removeLink,
  updateLinkMessages,
  querySuperchat,
  streamQuerySuperchat,
  getSuperChatGraph
};
