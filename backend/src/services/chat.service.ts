import { logger } from '../config/logger';
import { HttpErrors } from '../middleware/errorHandler';
import * as ChatModel from '../models/Chat.model';
import * as MessageModel from '../models/Message.model';
import { countTokens } from '../utils/tokenCounter';

/**
 * Chat with messages response
 */
export interface ChatWithMessages {
  chat: ChatModel.IChatWithStats;
  messages: MessageModel.IMessage[];
}

/**
 * Create a new chat
 */
export async function createNewChat(
  userId: string,
  title?: string
): Promise<ChatModel.IChat> {
  const chat = await ChatModel.createChat({
    user_id: userId,
    title: title || `Чат ${new Date().toLocaleDateString('ru-RU')}`
  });

  logger.info('Chat created', { chatId: chat.id, userId });
  
  return chat;
}

/**
 * List all chats for a user
 */
export async function listUserChats(userId: string): Promise<ChatModel.IChatWithStats[]> {
  return ChatModel.getChatsByUser(userId);
}

/**
 * Get chat details with messages
 */
export async function getChatDetail(
  chatId: string,
  userId: string,
  messageLimit: number = 100
): Promise<ChatWithMessages> {
  // Verify ownership
  const belongs = await ChatModel.chatBelongsToUser(chatId, userId);
  if (!belongs) {
    throw HttpErrors.NotFound('Чат не найден', 'CHAT_NOT_FOUND');
  }

  const chat = await ChatModel.getChatWithStats(chatId);
  if (!chat) {
    throw HttpErrors.NotFound('Чат не найден', 'CHAT_NOT_FOUND');
  }

  const messages = await MessageModel.getMessagesByChat(chatId, { limit: messageLimit });

  return { chat, messages };
}

/**
 * Add a message to a chat
 */
export async function addMessageToChat(
  chatId: string,
  userId: string,
  role: MessageModel.MessageRole,
  content: string
): Promise<MessageModel.IMessage> {
  // Verify ownership
  const belongs = await ChatModel.chatBelongsToUser(chatId, userId);
  if (!belongs) {
    throw HttpErrors.NotFound('Чат не найден', 'CHAT_NOT_FOUND');
  }

  // Count tokens
  const tokenCount = countTokens(content);

  // Add message
  const message = await MessageModel.addMessage({
    chat_id: chatId,
    role,
    content,
    token_count: tokenCount
  });

  logger.debug('Message added to chat', { 
    chatId, 
    messageId: message.id, 
    role, 
    tokenCount 
  });

  return message;
}

/**
 * Toggle message selection (for context inclusion)
 */
export async function toggleMessageSelection(
  chatId: string,
  messageId: string,
  userId: string
): Promise<MessageModel.IMessage> {
  // Verify ownership
  const belongs = await ChatModel.chatBelongsToUser(chatId, userId);
  if (!belongs) {
    throw HttpErrors.NotFound('Чат не найден', 'CHAT_NOT_FOUND');
  }

  // Get current message
  const message = await MessageModel.getMessageById(messageId);
  if (!message || message.chat_id !== chatId) {
    throw HttpErrors.NotFound('Сообщение не найдено', 'MESSAGE_NOT_FOUND');
  }

  // Toggle selection
  const updated = await MessageModel.updateSelection(messageId, !message.is_selected);
  if (!updated) {
    throw HttpErrors.InternalError('Не удалось обновить сообщение');
  }

  return updated;
}

/**
 * Set message selection explicitly
 */
export async function setMessageSelection(
  chatId: string,
  messageId: string,
  userId: string,
  isSelected: boolean
): Promise<MessageModel.IMessage> {
  // Verify ownership
  const belongs = await ChatModel.chatBelongsToUser(chatId, userId);
  if (!belongs) {
    throw HttpErrors.NotFound('Чат не найден', 'CHAT_NOT_FOUND');
  }

  // Get current message
  const message = await MessageModel.getMessageById(messageId);
  if (!message || message.chat_id !== chatId) {
    throw HttpErrors.NotFound('Сообщение не найдено', 'MESSAGE_NOT_FOUND');
  }

  // Update selection
  const updated = await MessageModel.updateSelection(messageId, isSelected);
  if (!updated) {
    throw HttpErrors.InternalError('Не удалось обновить сообщение');
  }

  return updated;
}

/**
 * Get selected messages for a chat
 */
export async function getSelectedMessagesForChat(
  chatId: string,
  userId: string
): Promise<MessageModel.IMessage[]> {
  // Verify ownership
  const belongs = await ChatModel.chatBelongsToUser(chatId, userId);
  if (!belongs) {
    throw HttpErrors.NotFound('Чат не найден', 'CHAT_NOT_FOUND');
  }

  return MessageModel.getSelectedMessages(chatId);
}

/**
 * Select all messages in a chat
 */
export async function selectAllInChat(
  chatId: string,
  userId: string
): Promise<{ count: number }> {
  // Verify ownership
  const belongs = await ChatModel.chatBelongsToUser(chatId, userId);
  if (!belongs) {
    throw HttpErrors.NotFound('Чат не найден', 'CHAT_NOT_FOUND');
  }

  const count = await MessageModel.selectAllMessages(chatId);
  return { count };
}

/**
 * Deselect all messages in a chat
 */
export async function deselectAllInChat(
  chatId: string,
  userId: string
): Promise<{ count: number }> {
  // Verify ownership
  const belongs = await ChatModel.chatBelongsToUser(chatId, userId);
  if (!belongs) {
    throw HttpErrors.NotFound('Чат не найден', 'CHAT_NOT_FOUND');
  }

  const count = await MessageModel.deselectAllMessages(chatId);
  return { count };
}

/**
 * Update chat
 */
export async function updateChat(
  chatId: string,
  userId: string,
  data: ChatModel.IChatUpdate
): Promise<ChatModel.IChat> {
  // Verify ownership
  const belongs = await ChatModel.chatBelongsToUser(chatId, userId);
  if (!belongs) {
    throw HttpErrors.NotFound('Чат не найден', 'CHAT_NOT_FOUND');
  }

  const updated = await ChatModel.updateChat(chatId, data);
  if (!updated) {
    throw HttpErrors.InternalError('Не удалось обновить чат');
  }

  return updated;
}

/**
 * Delete chat (soft delete)
 */
export async function deleteChat(chatId: string, userId: string): Promise<void> {
  // Verify ownership
  const belongs = await ChatModel.chatBelongsToUser(chatId, userId);
  if (!belongs) {
    throw HttpErrors.NotFound('Чат не найден', 'CHAT_NOT_FOUND');
  }

  const deleted = await ChatModel.deleteChat(chatId);
  if (!deleted) {
    throw HttpErrors.InternalError('Не удалось удалить чат');
  }

  logger.info('Chat deleted', { chatId, userId });
}

/**
 * Search messages in a chat
 */
export async function searchInChat(
  chatId: string,
  userId: string,
  searchQuery: string
): Promise<MessageModel.IMessage[]> {
  // Verify ownership
  const belongs = await ChatModel.chatBelongsToUser(chatId, userId);
  if (!belongs) {
    throw HttpErrors.NotFound('Чат не найден', 'CHAT_NOT_FOUND');
  }

  return MessageModel.searchMessages(chatId, searchQuery);
}

/**
 * Get selection stats for a chat
 */
export async function getSelectionStats(
  chatId: string,
  userId: string
): Promise<{ messageCount: number; selectedCount: number; tokenCount: number }> {
  // Verify ownership
  const belongs = await ChatModel.chatBelongsToUser(chatId, userId);
  if (!belongs) {
    throw HttpErrors.NotFound('Чат не найден', 'CHAT_NOT_FOUND');
  }

  const [messageCount, selectedCount, tokenCount] = await Promise.all([
    MessageModel.getMessageCount(chatId),
    MessageModel.getSelectedMessageCount(chatId),
    MessageModel.getSelectedTokenCount(chatId)
  ]);

  return { messageCount, selectedCount, tokenCount };
}

export default {
  createNewChat,
  listUserChats,
  getChatDetail,
  addMessageToChat,
  toggleMessageSelection,
  setMessageSelection,
  getSelectedMessagesForChat,
  selectAllInChat,
  deselectAllInChat,
  updateChat,
  deleteChat,
  searchInChat,
  getSelectionStats
};
