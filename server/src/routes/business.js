import { Router } from 'express';
import { getAll, getById, create, update, remove, getResponseTime } from '../controllers/businessController.js';
import { getCities } from '../controllers/locationController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = Router();

// Dedupe: delegate to locationController.js so URL stays stable (review #1.16).
router.get('/cities', getCities);
router.get('/', optionalAuth, getAll);
router.get('/:id', getById);
router.get('/:id/response-time', getResponseTime);
router.post('/', authenticate, create);
router.put('/:id', authenticate, update);
router.delete('/:id', authenticate, remove);

export default router;
