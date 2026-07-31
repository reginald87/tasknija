import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireFeature } from '../utils/subscriptionData.js';
import {
  getVendorOverview,
  getVendorRevenue,
  getVendorCustomers,
  getBusinessResponseTime,
} from '../controllers/analyticsController.js';

const router = Router();

router.get('/vendor/overview', authenticate, requireFeature(['analytics']), getVendorOverview);
router.get('/vendor/revenue', authenticate, requireFeature(['analytics']), getVendorRevenue);
router.get('/vendor/customers', authenticate, requireFeature(['analytics']), getVendorCustomers);
router.get('/businesses/:id/response-time', getBusinessResponseTime); // public

export default router;
