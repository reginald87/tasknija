import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getVendorOverview,
  getVendorRevenue,
  getVendorCustomers,
  getBusinessResponseTime,
} from '../controllers/analyticsController.js';

const router = Router();

router.get('/vendor/overview', authenticate, getVendorOverview);
router.get('/vendor/revenue', authenticate, getVendorRevenue);
router.get('/vendor/customers', authenticate, getVendorCustomers);
router.get('/businesses/:id/response-time', getBusinessResponseTime); // public

export default router;
