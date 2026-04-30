import { io, Socket } from 'socket.io-client';
import { useEffect, useCallback } from 'react';
import { getAccessToken } from './api';

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

let socket: Socket | null = null;

/**
 * Initialize socket connection
 */
export function initializeSocket(): Socket {
  if (socket?.connected) {
    return socket;
  }

  const token = getAccessToken();

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  return socket;
}

/**
 * Get socket instance
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Disconnect socket
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Reconnect with new token
 */
export function reconnectSocket(): void {
  disconnectSocket();
  initializeSocket();
}

// ==========================================
// Socket Events
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
  CHAT_MESSAGE_SELECTION_CHANGED: 'chat:message-selection-changed',
} as const;

// ==========================================
// Custom Hook for Socket Events
// ==========================================

/**
 * Hook to subscribe to socket events
 */
export function useSocketEvent<T = unknown>(
  event: string,
  handler: (data: T) => void
): void {
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on(event, handler);

    return () => {
      socket.off(event, handler);
    };
  }, [event, handler]);
}

/**
 * Hook to join/leave rooms
 */
export function useSocketRoom(
  joinEvent: string,
  leaveEvent: string,
  roomId: string | null
): void {
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !roomId) return;

    socket.emit(joinEvent, roomId);

    return () => {
      socket.emit(leaveEvent, roomId);
    };
  }, [joinEvent, leaveEvent, roomId]);
}

/**
 * Hook to emit socket events
 */
export function useSocketEmit(): (event: string, data?: unknown) => void {
  return useCallback((event: string, data?: unknown) => {
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit(event, data);
    }
  }, []);
}

export default {
  initializeSocket,
  getSocket,
  disconnectSocket,
  reconnectSocket,
  SocketEvents,
  useSocketEvent,
  useSocketRoom,
  useSocketEmit,
};
