import { Router } from 'express';
import { getConversations, getConversationById, createConversation } from '../controllers/conversationController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createConversationSchema } from '../validators/index.js';

const router = Router();

router.get('/', authenticate, getConversations);
router.get('/:id', authenticate, getConversationById);
router.post('/', authenticate, validate(createConversationSchema), createConversation);

export default router;
