import { Server, Socket } from 'socket.io';
import { socketAuthMiddleware } from '../middleware/auth.middleware';
import { logger } from '../config/logger';
import { getRedis, RedisKeys } from '../config/redis';

/**
 * Socket data with user info
 */
interface SocketData {
  userId: string;
  email: string;
}

/**
 * Extended socket with typed data
 */
type AuthenticatedSocket = Socket & {
  data: SocketData;
};

// Store io instance for use in other modules
let ioInstance: Server | null = null;

/**
 * Get the Socket.IO server instance
 */
export function getIO(): Server | null {
  return ioInstance;
}

/**
 * Initialize WebSocket handlers
 */
export function initializeWebSocket(io: Server): void {
  ioInstance = io;

  // Authentication middleware
  io.use((socket, next) => {
    socketAuthMiddleware(socket as AuthenticatedSocket, next)
      .catch(err => next(err));
  });

  // Connection handler
  io.on('connection', async (socket: AuthenticatedSocket) => {
    const userId = socket.data.userId;
    
    logger.info('WebSocket connected', { 
      socketId: socket.id, 
      userId 
    });

    // Join user's personal room
    await socket.join(`user:${userId}`);

    // Store connection in Redis
    const redis = getRedis();
    await redis.set(
      RedisKeys.socketConnection(userId),
      socket.id,
      'EX',
      3600 // 1 hour expiry
    );

    // Handle disconnect
    socket.on('disconnect', async (reason) => {
      logger.info('WebSocket disconnected', { 
        socketId: socket.id, 
        userId, 
        reason 
      });

      // Remove from Redis
      await redis.del(RedisKeys.socketConnection(userId));
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('WebSocket error', { 
        socketId: socket.id, 
        userId, 
        error: error.message 
      });
    });

    // ==========================================
    // Context Events
    // ==========================================

    // Join a super-chat room for real-time updates
    socket.on('context:join', (superChatId: string) => {
      socket.join(`super-chat:${superChatId}`);
      logger.debug('Joined super-chat room', { socketId: socket.id, superChatId });
    });

    // Leave a super-chat room
    socket.on('context:leave', (superChatId: string) => {
      socket.leave(`super-chat:${superChatId}`);
      logger.debug('Left super-chat room', { socketId: socket.id, superChatId });
    });

    // ==========================================
    // Chat Events
    // ==========================================

    // Join a chat room
    socket.on('chat:join', (chatId: string) => {
      socket.join(`chat:${chatId}`);
    });

    // Leave a chat room
    socket.on('chat:leave', (chatId: string) => {
      socket.leave(`chat:${chatId}`);
    });

    // ==========================================
    // Ping for keep-alive
    // ==========================================

    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
  });

  logger.info('WebSocket handlers initialized');
}

// ==========================================
// Emit helpers for use in services
// ==========================================

/**
 * Emit to a specific user
 */
export function emitToUser(userId: string, event: string, data: unknown): void {
  const io = getIO();
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

/**
 * Emit to a super-chat room
 */
export function emitToSuperChat(superChatId: string, event: string, data: unknown): void {
  const io = getIO();
  if (io) {
    io.to(`super-chat:${superChatId}`).emit(event, data);
  }
}

/**
 * Emit to a chat room
 */
export function emitToChat(chatId: string, event: string, data: unknown): void {
  const io = getIO();
  if (io) {
    io.to(`chat:${chatId}`).emit(event, data);
  }
}

// ==========================================
// Event types for type-safe emitting
// ==========================================

export const SocketEvents = {
  // Context events
  CONTEXT_LINK_ADDED: 'context:link-added',
  CONTEXT_LINK_REMOVED: 'context:link-removed',
  CONTEXT_MESSAGE_SELECTED: 'context:message-selected',
  CONTEXT_QUERY_STARTED: 'context:query-started',
  CONTEXT_QUERY_COMPLETED: 'context:query-completed',
  CONTEXT_QUERY_CHUNK: 'context:query-chunk',
  
  // Notification events
  NOTIFICATION_NEW_DIGEST: 'notification:new-digest',
  NOTIFICATION_QUOTA_LOW: 'notification:quota-low',
  NOTIFICATION_QUOTA_DEPLETED: 'notification:quota-depleted',
  
  // Chat events
  CHAT_MESSAGE_ADDED: 'chat:message-added',
  CHAT_MESSAGE_SELECTION_CHANGED: 'chat:message-selection-changed'
} as const;

export default {
  initializeWebSocket,
  getIO,
  emitToUser,
  emitToSuperChat,
  emitToChat,
  SocketEvents
};
