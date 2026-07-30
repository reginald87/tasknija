import { Router } from 'express';
import { getMessages, sendMessage } from '../controllers/messageController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/:conversationId', authenticate, getMessages);
router.post('/:conversationId', authenticate, sendMessage);

export default router;
