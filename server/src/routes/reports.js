import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { createReport, listReports, resolveReport } from '../controllers/reportsController.js';

const router = Router();

router.post('/', authenticate, createReport);
router.get('/', authenticate, authorize('admin'), listReports);
router.patch('/:id', authenticate, authorize('admin'), resolveReport);

export default router;
