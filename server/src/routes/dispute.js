import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { raise, list, resolve, listMine } from '../controllers/disputeController.js';
import { raiseDisputeSchema } from '../validators/index.js';

const router = Router();

// Admin: list all disputes
router.get('/', authenticate, authorize('admin'), list);
// Logged-in user: list disputes where I'm raiser or participant
router.get('/mine', authenticate, listMine);
// Raise a dispute on a transaction
router.post('/transactions/:transactionId', authenticate, validate(raiseDisputeSchema), raise);
// Admin: resolve a dispute
router.patch('/:id/resolve', authenticate, authorize('admin'), resolve);

export default router;
