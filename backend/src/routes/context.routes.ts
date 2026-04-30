import { Router } from 'express';
import * as contextController from '../controllers/context.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { queryRateLimiter } from '../middleware/rateLimiter';
import { validate, contextSchemas, idParamSchema } from '../middleware/validate';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route GET /api/project-map
 * @desc Get full project map for visualization
 * @access Private
 */
router.get(
  '/project-map',
  contextController.getProjectMap
);

/**
 * @route POST /api/super-chats
 * @desc Create a new super-chat
 * @access Private
 */
router.post(
  '/',
  validate(contextSchemas.createSuperChat),
  contextController.createSuperChat
);

/**
 * @route GET /api/super-chats/:id
 * @desc Get super-chat details with links and messages
 * @access Private
 */
router.get(
  '/:id',
  validate(idParamSchema, 'params'),
  contextController.getSuperChat
);

/**
 * @route PATCH /api/super-chats/:id
 * @desc Update super-chat
 * @access Private
 */
router.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  contextController.updateSuperChat
);

/**
 * @route DELETE /api/super-chats/:id
 * @desc Delete super-chat
 * @access Private
 */
router.delete(
  '/:id',
  validate(idParamSchema, 'params'),
  contextController.deleteSuperChat
);

/**
 * @route GET /api/super-chats/:id/graph
 * @desc Get super-chat graph visualization data
 * @access Private
 */
router.get(
  '/:id/graph',
  validate(idParamSchema, 'params'),
  contextController.getSuperChatGraph
);

/**
 * @route POST /api/super-chats/:id/link
 * @desc Add a link from a chat to the super-chat
 * @access Private
 */
router.post(
  '/:id/link',
  validate(idParamSchema, 'params'),
  validate(contextSchemas.link),
  contextController.addLink
);

/**
 * @route DELETE /api/super-chats/:id/links/:linkId
 * @desc Remove a link from the super-chat
 * @access Private
 */
router.delete(
  '/:id/links/:linkId',
  contextController.removeLink
);

/**
 * @route PATCH /api/links/:linkId/messages
 * @desc Update selected messages for a link
 * @access Private
 */
router.patch(
  '/links/:linkId/messages',
  validate(contextSchemas.updateLinkMessages),
  contextController.updateLinkMessages
);

/**
 * @route POST /api/super-chats/:id/query
 * @desc Send a query to the super-chat with merged context
 * @access Private
 */
router.post(
  '/:id/query',
  validate(idParamSchema, 'params'),
  validate(contextSchemas.query),
  queryRateLimiter,
  contextController.querySuperchat
);

/**
 * @route POST /api/super-chats/:id/query/stream
 * @desc Stream a query response from the super-chat
 * @access Private
 */
router.post(
  '/:id/query/stream',
  validate(idParamSchema, 'params'),
  validate(contextSchemas.query),
  queryRateLimiter,
  contextController.streamQuerySuperchat
);

export default router;
