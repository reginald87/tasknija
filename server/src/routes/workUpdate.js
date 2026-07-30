import { Router } from 'express';
import { getWorkUpdates, createWorkUpdate } from '../controllers/workUpdateController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/project/:projectId', authenticate, getWorkUpdates);
router.post('/project/:projectId', authenticate, createWorkUpdate);

export default router;
