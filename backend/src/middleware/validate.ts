import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { HttpErrors } from './errorHandler';

/**
 * Validation source (where to look for data)
 */
export type ValidationSource = 'body' | 'query' | 'params';

/**
 * Validation middleware factory
 * @param schema Joi validation schema
 * @param source Where to validate (body, query, or params)
 */
export function validate(
  schema: Joi.ObjectSchema,
  source: ValidationSource = 'body'
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const data = req[source];

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const details = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }));

      const errorMessage = details.map(d => d.message).join('; ');
      
      next(HttpErrors.BadRequest(errorMessage, 'VALIDATION_ERROR'));
      return;
    }

    // Replace request data with validated and sanitized value
    req[source] = value;
    next();
  };
}

// ============================================
// Common Validation Schemas
// ============================================

/**
 * UUID validation
 */
export const uuidSchema = Joi.string().uuid({ version: 'uuidv4' });

/**
 * Email validation
 */
export const emailSchema = Joi.string().email().lowercase().trim();

/**
 * Password validation (min 8 chars, at least one letter and one number)
 */
export const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[A-Za-z])(?=.*\d)/)
  .messages({
    'string.min': 'Пароль должен содержать минимум 8 символов',
    'string.max': 'Пароль слишком длинный',
    'string.pattern.base': 'Пароль должен содержать буквы и цифры'
  });

/**
 * Nickname validation
 */
export const nicknameSchema = Joi.string()
  .min(2)
  .max(50)
  .trim()
  .messages({
    'string.min': 'Никнейм должен содержать минимум 2 символа',
    'string.max': 'Никнейм слишком длинный'
  });

/**
 * Pagination schemas
 */
export const paginationSchema = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0)
};

/**
 * ID parameter schema
 */
export const idParamSchema = Joi.object({
  id: uuidSchema.required()
});

// ============================================
// Auth Validation Schemas
// ============================================

export const authSchemas = {
  register: Joi.object({
    email: emailSchema.required(),
    password: passwordSchema.required(),
    nickname: nicknameSchema.optional()
  }),

  login: Joi.object({
    email: emailSchema.required(),
    password: Joi.string().required()
  }),

  refresh: Joi.object({
    refreshToken: Joi.string().required()
  })
};

// ============================================
// Chat Validation Schemas
// ============================================

export const chatSchemas = {
  create: Joi.object({
    title: Joi.string().max(255).trim().optional()
  }),

  addMessage: Joi.object({
    content: Joi.string().min(1).max(100000).required(),
    role: Joi.string().valid('user', 'assistant', 'system').default('user')
  }),

  toggleSelection: Joi.object({
    isSelected: Joi.boolean().required()
  }),

  updateMessages: Joi.object({
    messageIds: Joi.array().items(uuidSchema).required()
  })
};

// ============================================
// Context/Super-Chat Validation Schemas
// ============================================

export const contextSchemas = {
  createSuperChat: Joi.object({
    title: Joi.string().max(255).trim().required()
  }),

  link: Joi.object({
    sourceChatId: uuidSchema.required(),
    linkType: Joi.string().valid('chat', 'super_chat').default('chat')
  }),

  query: Joi.object({
    message: Joi.string().min(1).max(10000).required()
  }),

  updateLinkMessages: Joi.object({
    messageIds: Joi.array().items(uuidSchema).required()
  })
};

// ============================================
// Tariff Validation Schemas
// ============================================

export const tariffSchemas = {
  upgrade: Joi.object({
    plan: Joi.string().valid('monthly', 'yearly').required()
  })
};

// ============================================
// Notification Validation Schemas
// ============================================

export const notificationSchemas = {
  updateConfig: Joi.object({
    telegramChatId: Joi.string().allow('', null).optional(),
    email: emailSchema.allow('', null).optional(),
    slackWebhook: Joi.string().uri().allow('', null).optional(),
    schedule: Joi.object({
      enabled: Joi.boolean().default(false),
      time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      days: Joi.array().items(Joi.number().min(0).max(6)).optional(),
      timezone: Joi.string().optional()
    }).optional(),
    triggers: Joi.object({
      onNewLink: Joi.boolean().default(false),
      onDigest: Joi.boolean().default(true),
      onQuotaLow: Joi.boolean().default(true)
    }).optional()
  })
};

export default validate;
