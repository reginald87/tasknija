import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { listMyNotifications, markRead, getUnreadCount } from '../controllers/notificationsController.js';

const router = Router();

router.use(authenticate);

router.get('/', listMyNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/:id/read', markRead);

export default router;
