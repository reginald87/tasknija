import { Router } from 'express';
import { getAll, create, update, remove } from '../controllers/countryController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', getAll);
router.post('/', authenticate, authorize('admin'), create);
router.put('/:id', authenticate, authorize('admin'), update);
router.delete('/:id', authenticate, authorize('admin'), remove);

export default router;
