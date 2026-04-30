import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import * as chatService from '../services/chat.service';

/**
 * Get all chats for current user
 * GET /api/chats
 */
export const listChats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  
  const chats = await chatService.listUserChats(userId);

  res.json({
    chats,
    count: chats.length
  });
});

/**
 * Create a new chat
 * POST /api/chats
 */
export const createChat = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { title } = req.body as { title?: string };

  const chat = await chatService.createNewChat(userId, title);

  res.status(201).json({
    message: 'Чат создан',
    chat
  });
});

/**
 * Get chat details with messages
 * GET /api/chats/:id
 */
export const getChat = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;
  const { limit } = req.query;

  const messageLimit = limit ? parseInt(limit as string, 10) : 100;
  const result = await chatService.getChatDetail(id, userId, messageLimit);

  res.json(result);
});

/**
 * Update chat
 * PATCH /api/chats/:id
 */
export const updateChat = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;
  const { title, position_x, position_y } = req.body as {
    title?: string;
    position_x?: number;
    position_y?: number;
  };

  const chat = await chatService.updateChat(id, userId, {
    title,
    position_x,
    position_y
  });

  res.json({
    message: 'Чат обновлён',
    chat
  });
});

/**
 * Delete chat
 * DELETE /api/chats/:id
 */
export const deleteChat = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;

  await chatService.deleteChat(id, userId);

  res.json({
    message: 'Чат удалён'
  });
});

/**
 * Add message to chat
 * POST /api/chats/:id/messages
 */
export const addMessage = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;
  const { content, role } = req.body as {
    content: string;
    role?: 'user' | 'assistant' | 'system';
  };

  const message = await chatService.addMessageToChat(id, userId, role || 'user', content);

  res.status(201).json({
    message: 'Сообщение добавлено',
    data: message
  });
});

/**
 * Toggle message selection
 * PATCH /api/chats/:id/messages/:msgId/select
 */
export const toggleSelection = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id, msgId } = req.params;

  const message = await chatService.toggleMessageSelection(id, msgId, userId);

  res.json({
    message: message.is_selected ? 'Сообщение выбрано' : 'Выбор снят',
    data: message
  });
});

/**
 * Set message selection explicitly
 * PUT /api/chats/:id/messages/:msgId/select
 */
export const setSelection = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id, msgId } = req.params;
  const { isSelected } = req.body as { isSelected: boolean };

  const message = await chatService.setMessageSelection(id, msgId, userId, isSelected);

  res.json({
    message: message.is_selected ? 'Сообщение выбрано' : 'Выбор снят',
    data: message
  });
});

/**
 * Get selected messages for a chat
 * GET /api/chats/:id/selected
 */
export const getSelected = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;

  const messages = await chatService.getSelectedMessagesForChat(id, userId);
  const stats = await chatService.getSelectionStats(id, userId);

  res.json({
    messages,
    stats
  });
});

/**
 * Select all messages in a chat
 * POST /api/chats/:id/select-all
 */
export const selectAll = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;

  const result = await chatService.selectAllInChat(id, userId);

  res.json({
    message: `Выбрано ${result.count} сообщений`,
    count: result.count
  });
});

/**
 * Deselect all messages in a chat
 * POST /api/chats/:id/deselect-all
 */
export const deselectAll = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;

  const result = await chatService.deselectAllInChat(id, userId);

  res.json({
    message: 'Выбор со всех сообщений снят',
    count: result.count
  });
});

/**
 * Search messages in a chat
 * GET /api/chats/:id/search
 */
export const searchMessages = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    res.json({ messages: [] });
    return;
  }

  const messages = await chatService.searchInChat(id, userId, q);

  res.json({
    messages,
    count: messages.length
  });
});

export default {
  listChats,
  createChat,
  getChat,
  updateChat,
  deleteChat,
  addMessage,
  toggleSelection,
  setSelection,
  getSelected,
  selectAll,
  deselectAll,
  searchMessages
};
