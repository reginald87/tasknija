import { Router } from 'express';
import {
  createTransaction, getMyTransactions, completeTransaction,
  raiseDispute, getMyDisputes,
  getTransactionMilestones, completeMilestone, confirmMilestone,
} from '../controllers/transactionController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/', authenticate, createTransaction);
router.get('/my', authenticate, getMyTransactions);
router.put('/:id/complete', authenticate, completeTransaction);
router.get('/:id/milestones', authenticate, getTransactionMilestones);
router.put('/:id/milestones/:milestoneId/complete', authenticate, completeMilestone);
router.put('/:id/milestones/:milestoneId/confirm', authenticate, confirmMilestone);

export default router;
