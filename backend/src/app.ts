import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { env } from './config/env';
import { httpLogStream, logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

// Import routes
import authRoutes from './routes/auth.routes';
import chatRoutes from './routes/chat.routes';
import contextRoutes from './routes/context.routes';
import tariffRoutes from './routes/tariff.routes';
import digestRoutes from './routes/digest.routes';
import notificationRoutes from './routes/notification.routes';

/**
 * Create and configure Express application
 */
export function createApp(): Application {
  const app = express();

  // ============================================
  // Security Middleware
  // ============================================
  
  // Helmet for security headers
  app.use(helmet({
    contentSecurityPolicy: env.isProduction ? undefined : false
  }));

  // CORS configuration
  app.use(cors({
    origin: env.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
  }));

  // ============================================
  // Request Processing Middleware
  // ============================================
  
  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  if (!env.isTest) {
    app.use(morgan(env.log.format, { stream: httpLogStream }));
  }

  // Rate limiting
  app.use(rateLimiter);

  // Request ID middleware
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.requestId = req.headers['x-request-id'] as string || 
      `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    next();
  });

  // ============================================
  // Health Check Endpoints
  // ============================================
  
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  app.get('/health/ready', async (_req: Request, res: Response) => {
    try {
      // Import health checks
      const { checkDatabaseHealth } = await import('./config/database');
      const { checkNeo4jHealth } = await import('./config/neo4j');
      const { checkRedisHealth } = await import('./config/redis');

      const [dbHealth, neo4jHealth, redisHealth] = await Promise.all([
        checkDatabaseHealth(),
        checkNeo4jHealth(),
        checkRedisHealth()
      ]);

      const allHealthy = dbHealth && neo4jHealth && redisHealth;

      res.status(allHealthy ? 200 : 503).json({
        status: allHealthy ? 'ready' : 'degraded',
        checks: {
          postgres: dbHealth ? 'ok' : 'error',
          neo4j: neo4jHealth ? 'ok' : 'error',
          redis: redisHealth ? 'ok' : 'error'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        message: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  });

  // ============================================
  // API Routes
  // ============================================
  
  const apiRouter = express.Router();

  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/chats', chatRoutes);
  apiRouter.use('/super-chats', contextRoutes);
  apiRouter.use('/tariffs', tariffRoutes);
  apiRouter.use('/digests', digestRoutes);
  apiRouter.use('/notifications', notificationRoutes);

  // Mount API routes
  app.use('/api', apiRouter);

  // ============================================
  // API Documentation (development only)
  // ============================================
  
  if (env.isDevelopment) {
    app.get('/api', (_req: Request, res: Response) => {
      res.json({
        name: 'Context Builder API',
        version: '1.0.0',
        description: 'API для Конструктора контекста',
        endpoints: {
          auth: '/api/auth',
          chats: '/api/chats',
          superChats: '/api/super-chats',
          tariffs: '/api/tariffs',
          digests: '/api/digests',
          notifications: '/api/notifications'
        },
        health: '/health',
        documentation: 'See backend/README.md for full API documentation'
      });
    });
  }

  // ============================================
  // 404 Handler
  // ============================================
  
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: 'The requested resource was not found',
      path: _req.path
    });
  });

  // ============================================
  // Error Handler (must be last)
  // ============================================
  
  app.use(errorHandler);

  return app;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      userId?: string;
    }
  }
}

export default createApp;
