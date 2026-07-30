import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getAvailability,
  setWeeklyAvailability,
  addBlockedDate,
  removeBlockedDate
} from '../controllers/availabilityController.js';

const router = Router();
router.get('/:id/availability', getAvailability); // public
router.put('/:id/availability', authenticate, setWeeklyAvailability);
router.post('/:id/blocked-dates', authenticate, addBlockedDate);
router.delete('/:id/blocked-dates/:dateId', authenticate, removeBlockedDate);

export default router;
