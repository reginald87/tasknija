import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { list, createRequest, approve, reject } from '../controllers/withdrawalController.js';

const router = Router();

router.get('/', authenticate, list);
router.post('/', authenticate, createRequest);
router.patch('/:id/approve', authenticate, authorize('admin'), approve);
router.patch('/:id/reject', authenticate, authorize('admin'), reject);

export default router;
