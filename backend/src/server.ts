import http from 'http';
import { Server as SocketServer } from 'socket.io';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { initializeServices, shutdownServices } from './config';
import { initializeWebSocket } from './websocket';
import { initializeCronJobs, stopCronJobs } from './cron';

/**
 * Main server entry point
 */
async function startServer(): Promise<void> {
  try {
    // Initialize all services (DB, Redis, Neo4j, LLM)
    await initializeServices();

    // Create Express app
    const app = createApp();

    // Create HTTP server
    const httpServer = http.createServer(app);

    // Initialize Socket.io
    const io = new SocketServer(httpServer, {
      cors: {
        origin: env.cors.origin,
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Initialize WebSocket handlers
    initializeWebSocket(io);

    // Initialize cron jobs
    initializeCronJobs();

    // Start HTTP server
    httpServer.listen(env.port, () => {
      logger.info(`Server started`, {
        port: env.port,
        environment: env.nodeEnv,
        apiUrl: `http://localhost:${env.port}/api`
      });
    });

    // ============================================
    // Graceful Shutdown
    // ============================================
    
    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);

      // Stop accepting new connections
      httpServer.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Stop cron jobs
          stopCronJobs();
          logger.info('Cron jobs stopped');

          // Close all socket connections
          io.close(() => {
            logger.info('Socket.io server closed');
          });

          // Shutdown all services
          await shutdownServices();

          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', { error });
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      void shutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('Unhandled promise rejection', { reason });
      void shutdown('unhandledRejection');
    });

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Start the server
void startServer();
