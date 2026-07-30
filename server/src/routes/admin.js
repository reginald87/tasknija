import { Router } from 'express';
import {
  getStats,
  getBusinesses, verifyBusiness, deleteBusiness,
  getReviews, deleteReview,
  getWallets, getWalletTransactions,
  getTransactions, releaseEscrow, cancelTransaction,
  getDisputes, resolveDispute,
  getUsers, updateUserRole, deleteUser,
  getPlatformConfig, updatePlatformConfig,
  getAdminStates, createState, updateState, deleteState,
  getAdminLgas, createLga, updateLga, deleteLga,
  getAdminCities, createCity, updateCity, deleteCity,
  listAdminAuditLog,
} from '../controllers/adminController.js';
import {
  listPendingVerifications,
  approveVerification,
  rejectVerification,
} from '../controllers/vendorVerificationController.js';
import {
  adminList as listWithdrawals,
  approve as approveWithdrawal,
  reject as rejectWithdrawal,
} from '../controllers/withdrawalController.js';
import { getAdminAnalytics } from '../controllers/analyticsController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/stats', authenticate, authorize('admin'), getStats);
router.get('/analytics', authenticate, authorize('admin'), getAdminAnalytics);
router.get('/users', authenticate, authorize('admin'), getUsers);
router.put('/users/:id/role', authenticate, authorize('admin'), updateUserRole);
router.delete('/users/:id', authenticate, authorize('admin'), deleteUser);
router.get('/businesses', authenticate, authorize('admin'), getBusinesses);
router.put('/businesses/:id/verify', authenticate, authorize('admin'), verifyBusiness);
router.delete('/businesses/:id', authenticate, authorize('admin'), deleteBusiness);
router.get('/reviews', authenticate, authorize('admin'), getReviews);
router.delete('/reviews/:id', authenticate, authorize('admin'), deleteReview);
router.get('/wallets', authenticate, authorize('admin'), getWallets);
router.get('/wallet-transactions', authenticate, authorize('admin'), getWalletTransactions);
router.get('/transactions', authenticate, authorize('admin'), getTransactions);
router.post('/transactions/:id/release', authenticate, authorize('admin'), releaseEscrow);
router.post('/transactions/:id/cancel', authenticate, authorize('admin'), cancelTransaction);
router.get('/disputes', authenticate, authorize('admin'), getDisputes);
router.put('/disputes/:id/resolve', authenticate, authorize('admin'), resolveDispute);
router.get('/platform-config', authenticate, authorize('admin'), getPlatformConfig);
router.put('/platform-config', authenticate, authorize('admin'), updatePlatformConfig);
router.get('/withdraw-requests', authenticate, authorize('admin'), listWithdrawals);
router.put('/withdraw-requests/:id/approve', authenticate, authorize('admin'), approveWithdrawal);
router.put('/withdraw-requests/:id/reject', authenticate, authorize('admin'), rejectWithdrawal);

// Location management
router.get('/locations/states', authenticate, authorize('admin'), getAdminStates);
router.post('/locations/states', authenticate, authorize('admin'), createState);
router.put('/locations/states/:id', authenticate, authorize('admin'), updateState);
router.delete('/locations/states/:id', authenticate, authorize('admin'), deleteState);
router.get('/locations/lgas', authenticate, authorize('admin'), getAdminLgas);
router.post('/locations/lgas', authenticate, authorize('admin'), createLga);
router.put('/locations/lgas/:id', authenticate, authorize('admin'), updateLga);
router.delete('/locations/lgas/:id', authenticate, authorize('admin'), deleteLga);
router.get('/locations/cities', authenticate, authorize('admin'), getAdminCities);
router.post('/locations/cities', authenticate, authorize('admin'), createCity);
router.put('/locations/cities/:id', authenticate, authorize('admin'), updateCity);
router.delete('/locations/cities/:id', authenticate, authorize('admin'), deleteCity);

// Vendor verification (#5.12)
router.get('/vendor-verifications', authenticate, authorize('admin'), listPendingVerifications);
router.patch('/vendor-verifications/:id/approve', authenticate, authorize('admin'), approveVerification);
router.patch('/vendor-verifications/:id/reject', authenticate, authorize('admin'), rejectVerification);

// Admin audit log (#3.18)
router.get('/audit-log', authenticate, authorize('admin'), listAdminAuditLog);

export default router;
