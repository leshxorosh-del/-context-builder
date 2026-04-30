import { Router } from 'express';
import * as chatController from '../controllers/chat.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate, chatSchemas, idParamSchema } from '../middleware/validate';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route GET /api/chats
 * @desc Get all chats for current user
 * @access Private
 */
router.get('/', chatController.listChats);

/**
 * @route POST /api/chats
 * @desc Create a new chat
 * @access Private
 */
router.post(
  '/',
  validate(chatSchemas.create),
  chatController.createChat
);

/**
 * @route GET /api/chats/:id
 * @desc Get chat details with messages
 * @access Private
 */
router.get(
  '/:id',
  validate(idParamSchema, 'params'),
  chatController.getChat
);

/**
 * @route PATCH /api/chats/:id
 * @desc Update chat
 * @access Private
 */
router.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  chatController.updateChat
);

/**
 * @route DELETE /api/chats/:id
 * @desc Delete chat (soft delete)
 * @access Private
 */
router.delete(
  '/:id',
  validate(idParamSchema, 'params'),
  chatController.deleteChat
);

/**
 * @route POST /api/chats/:id/messages
 * @desc Add message to chat
 * @access Private
 */
router.post(
  '/:id/messages',
  validate(idParamSchema, 'params'),
  validate(chatSchemas.addMessage),
  chatController.addMessage
);

/**
 * @route PATCH /api/chats/:id/messages/:msgId/select
 * @desc Toggle message selection
 * @access Private
 */
router.patch(
  '/:id/messages/:msgId/select',
  chatController.toggleSelection
);

/**
 * @route PUT /api/chats/:id/messages/:msgId/select
 * @desc Set message selection explicitly
 * @access Private
 */
router.put(
  '/:id/messages/:msgId/select',
  validate(chatSchemas.toggleSelection),
  chatController.setSelection
);

/**
 * @route GET /api/chats/:id/selected
 * @desc Get selected messages for a chat
 * @access Private
 */
router.get(
  '/:id/selected',
  validate(idParamSchema, 'params'),
  chatController.getSelected
);

/**
 * @route POST /api/chats/:id/select-all
 * @desc Select all messages in a chat
 * @access Private
 */
router.post(
  '/:id/select-all',
  validate(idParamSchema, 'params'),
  chatController.selectAll
);

/**
 * @route POST /api/chats/:id/deselect-all
 * @desc Deselect all messages in a chat
 * @access Private
 */
router.post(
  '/:id/deselect-all',
  validate(idParamSchema, 'params'),
  chatController.deselectAll
);

/**
 * @route GET /api/chats/:id/search
 * @desc Search messages in a chat
 * @access Private
 */
router.get(
  '/:id/search',
  validate(idParamSchema, 'params'),
  chatController.searchMessages
);

export default router;
