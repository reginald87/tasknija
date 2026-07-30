import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { listMyFavorites, addFavorite, removeFavorite, checkFavorite } from '../controllers/favoritesController.js';

const router = Router();
router.use(authenticate);

router.get('/', listMyFavorites);
router.get('/:businessId/check', checkFavorite);
router.post('/:businessId', addFavorite);
router.delete('/:businessId', removeFavorite);

export default router;
