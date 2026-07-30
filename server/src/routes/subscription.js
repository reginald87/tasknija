import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  getPackages,
  createPackage,
  updatePackage,
  deletePackage,
  subscribe,
  initializeSubscription,
  verifySubscriptionPayment,
  getMySubscription,
  getAllSubscriptions,
  verifySubscription,
  rejectSubscription,
} from '../controllers/subscriptionController.js';
import { createSubscriptionPackageSchema, subscribeSchema, initializeSubscriptionSchema } from '../validators/index.js';

const router = Router();

router.get('/packages', getPackages);
router.get('/packages/:id', getPackages);
router.post('/packages', authenticate, authorize('admin'), validate(createSubscriptionPackageSchema), createPackage);
router.put('/packages/:id', authenticate, authorize('admin'), updatePackage);
router.delete('/packages/:id', authenticate, authorize('admin'), deletePackage);

router.post('/subscribe', authenticate, validate(subscribeSchema), subscribe);
router.post('/initialize-payment', authenticate, validate(initializeSubscriptionSchema), initializeSubscription);
router.get('/verify-payment', authenticate, verifySubscriptionPayment);
router.get('/my', authenticate, getMySubscription);

router.get('/admin/all', authenticate, authorize('admin'), getAllSubscriptions);
router.put('/admin/:id/verify', authenticate, authorize('admin'), verifySubscription);
router.put('/admin/:id/reject', authenticate, authorize('admin'), rejectSubscription);

export default router;
