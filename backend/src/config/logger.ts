import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { env } from './env';

const { combine, timestamp, printf, colorize, errors } = winston.format;

/**
 * Custom log format for console output
 */
const consoleFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
  const stackStr = stack ? `\n${stack}` : '';
  return `${timestamp} [${level}]: ${message}${metaStr ? ` ${metaStr}` : ''}${stackStr}`;
});

/**
 * Custom log format for file output (JSON)
 */
const fileFormat = printf(({ level, message, timestamp, ...meta }) => {
  return JSON.stringify({
    timestamp,
    level,
    message,
    ...meta
  });
});

/**
 * Create transport for daily rotating log files
 */
const createFileTransport = (filename: string, level?: string): DailyRotateFile => {
  return new DailyRotateFile({
    filename: path.join(__dirname, `../../logs/${filename}-%DATE%.log`),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level,
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      fileFormat
    )
  });
};

/**
 * Winston logger instance
 */
export const logger = winston.createLogger({
  level: env.log.level,
  defaultMeta: { service: 'context-builder' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        consoleFormat
      ),
      silent: env.isTest
    })
  ]
});

// Add file transports in production
if (env.isProduction) {
  logger.add(createFileTransport('combined'));
  logger.add(createFileTransport('error', 'error'));
}

/**
 * Stream for Morgan HTTP logging
 */
export const httpLogStream = {
  write: (message: string): void => {
    logger.http(message.trim());
  }
};

/**
 * Log context for request tracing
 */
export interface LogContext {
  requestId?: string;
  userId?: string;
  action?: string;
}

/**
 * Create a child logger with additional context
 */
export function createContextLogger(context: LogContext): winston.Logger {
  return logger.child(context);
}

export default logger;
