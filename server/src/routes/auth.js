import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  refreshToken,
  googleAuth,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  googleSchema,
} from '../utils/validation.js';

const router = Router();

const rateLimitMessage = {
  success: false,
  error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' }
};

// Limits are configurable. In development they default to generous values so
// the flows can be tested locally; in production they fall back to strict ones.
const isProd = process.env.NODE_ENV === 'production';
const num = (val, fallback) => {
  const n = parseInt(val, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
const LOGIN_MAX = num(process.env.RATE_LIMIT_LOGIN_MAX, isProd ? 5 : 100);
const REGISTER_MAX = num(process.env.RATE_LIMIT_REGISTER_MAX, isProd ? 3 : 50);
const RESET_MAX = num(process.env.RATE_LIMIT_RESET_MAX, isProd ? 3 : 50);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: LOGIN_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: REGISTER_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: RESET_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage
});

router.post('/register', registerLimiter, validate(registerSchema), register);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  forgotPassword
);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.post('/refresh-token', validate(refreshTokenSchema), refreshToken);
router.post('/google', validate(googleSchema), googleAuth);

export default router;
