import { Router } from 'express';
import { createQuote, getConversationQuotes, acceptQuote, rejectQuote, cancelQuote } from '../controllers/quoteController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/', authenticate, createQuote);
router.get('/conversation/:conversationId', authenticate, getConversationQuotes);
router.put('/:id/accept', authenticate, acceptQuote);
router.put('/:id/reject', authenticate, rejectQuote);
router.put('/:id/cancel', authenticate, cancelQuote);

export default router;
