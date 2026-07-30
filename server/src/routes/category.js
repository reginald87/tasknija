import { Router } from 'express';
import { getAll, getBySlug, create, update, remove } from '../controllers/categoryController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', getAll);
router.get('/:slug', getBySlug);
router.post('/', authenticate, authorize('admin'), create);
router.put('/:id', authenticate, authorize('admin'), update);
router.delete('/:id', authenticate, authorize('admin'), remove);

export default router;
