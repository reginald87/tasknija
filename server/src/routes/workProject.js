import { Router } from 'express';
import { getWorkProjects, createWorkProject, updateWorkProject } from '../controllers/workProjectController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateWorkProjectSchema } from '../validators/index.js';

const router = Router();

router.get('/conversation/:conversationId', authenticate, getWorkProjects);
router.post('/conversation/:conversationId', authenticate, createWorkProject);
router.put('/:id', authenticate, validate(updateWorkProjectSchema), updateWorkProject);

export default router;
