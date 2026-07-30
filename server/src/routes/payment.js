import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  initializeDeposit,
  verifyDepositPayment,
  requestWithdrawal,
  getBalance,
  getMyWalletTransactions,
  getMyWithdrawals,
} from '../controllers/paymentController.js';

const router = Router();

// Wallet
router.get('/wallet', authenticate, getBalance);
router.get('/wallet/transactions', authenticate, getMyWalletTransactions);

// Deposits (Paystack)
router.post('/deposit/initialize', authenticate, initializeDeposit);
// Alias matching the client's expected path.
router.post('/initialize-deposit', authenticate, initializeDeposit);
router.get('/deposit/verify', authenticate, verifyDepositPayment);

// Withdrawal requests (vendor)
router.post('/withdrawals', authenticate, requestWithdrawal);
router.get('/withdrawals/my', authenticate, getMyWithdrawals);

export default router;
