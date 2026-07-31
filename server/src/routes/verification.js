import { Router } from 'express';

import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  getMyVerification,
  submitVerification,
} from '../controllers/vendorVerificationController.js';
import { submitVerificationSchema } from '../utils/validation.js';

const router = Router();

router.get('/my', authenticate, getMyVerification);
router.post('/submit', authenticate, validate(submitVerificationSchema), submitVerification);

export default router;
