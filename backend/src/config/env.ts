import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

/**
 * Application environment configuration
 * All environment variables are validated and typed here
 */
export const env = {
  // Node environment
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || 'localhost',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3001',

  // PostgreSQL
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'context_builder',
    user: process.env.POSTGRES_USER || 'context_user',
    password: process.env.POSTGRES_PASSWORD || 'dev_password',
    get connectionString(): string {
      return process.env.DATABASE_URL || 
        `postgresql://${this.user}:${this.password}@${this.host}:${this.port}/${this.database}`;
    }
  },

  // Neo4j
  neo4j: {
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    user: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'dev_password'
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    get url(): string {
      return process.env.REDIS_URL || 
        `redis://${this.password ? `:${this.password}@` : ''}${this.host}:${this.port}`;
    }
  },

  // JWT
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret_change_in_prod',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_in_prod',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  // LLM Provider
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4096', 10)
  },

  // Notifications
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || ''
  },
  
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM || 'Context Builder <noreply@contextbuilder.app>'
  },

  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL || ''
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
  },

  // Logging
  log: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined'
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173'
  }
} as const;

/**
 * Validate required environment variables
 */
export function validateEnv(): void {
  const required: string[] = [];

  if (env.isProduction) {
    required.push(
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'POSTGRES_PASSWORD',
      'NEO4J_PASSWORD'
    );
  }

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Warn about missing optional but recommended variables
  const recommended = ['OPENAI_API_KEY'];
  const missingRecommended = recommended.filter(key => !process.env[key]);
  
  if (missingRecommended.length > 0 && !env.isTest) {
    console.warn(`Warning: Missing recommended environment variables: ${missingRecommended.join(', ')}`);
  }
}

export default env;
