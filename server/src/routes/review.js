import { Router } from 'express';
import { getByBusiness, create } from '../controllers/reviewController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/business/:businessId', getByBusiness);
router.post('/', authenticate, create);

export default router;
