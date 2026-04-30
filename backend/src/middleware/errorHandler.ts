import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { env } from '../config/env';

/**
 * Custom application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Common HTTP errors
 */
export const HttpErrors = {
  BadRequest: (message: string = 'Bad Request', code?: string): AppError => 
    new AppError(message, 400, code),
  
  Unauthorized: (message: string = 'Unauthorized', code?: string): AppError => 
    new AppError(message, 401, code),
  
  Forbidden: (message: string = 'Forbidden', code?: string): AppError => 
    new AppError(message, 403, code),
  
  NotFound: (message: string = 'Not Found', code?: string): AppError => 
    new AppError(message, 404, code),
  
  Conflict: (message: string = 'Conflict', code?: string): AppError => 
    new AppError(message, 409, code),
  
  TooManyRequests: (message: string = 'Too Many Requests', code?: string): AppError => 
    new AppError(message, 429, code),
  
  InternalError: (message: string = 'Internal Server Error', code?: string): AppError => 
    new AppError(message, 500, code),
  
  ServiceUnavailable: (message: string = 'Service Unavailable', code?: string): AppError => 
    new AppError(message, 503, code)
};

/**
 * Error response structure
 */
interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  statusCode: number;
  timestamp: string;
  path: string;
  requestId?: string;
  stack?: string;
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Determine if this is an operational error
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const isOperational = isAppError ? err.isOperational : false;

  // Log the error
  const logContext = {
    error: err.message,
    statusCode,
    path: req.path,
    method: req.method,
    requestId: req.requestId,
    userId: req.userId,
    isOperational
  };

  if (statusCode >= 500) {
    logger.error('Server error', { ...logContext, stack: err.stack });
  } else if (statusCode >= 400) {
    logger.warn('Client error', logContext);
  }

  // Build error response
  const errorResponse: ErrorResponse = {
    error: getErrorName(statusCode),
    message: isOperational || env.isDevelopment ? err.message : 'An unexpected error occurred',
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.path,
    requestId: req.requestId
  };

  // Add code if available
  if (isAppError && err.code) {
    errorResponse.code = err.code;
  }

  // Add stack trace in development
  if (env.isDevelopment && err.stack) {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * Get human-readable error name from status code
 */
function getErrorName(statusCode: number): string {
  const errorNames: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout'
  };
  return errorNames[statusCode] || 'Error';
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default errorHandler;
