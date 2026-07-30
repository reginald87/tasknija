import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

import { prisma } from './config/prisma.js';
import { connectDB } from './config/db.js';
import { atomicWalletCredit } from './utils/wallet.js';
import { httpLogger, logger } from './middleware/logger.js';
import { errorHandler, AppError } from './middleware/errorHandler.js';
import { config } from './config/index.js';
import { verifyPaystackSignature } from './utils/paystack.js';
import { sendNotification } from './utils/notifications.js';
import { sendDepositConfirmation, sendSubscriptionReceipt } from './utils/email.js';

import authRoutes from './routes/auth.js';
import businessRoutes from './routes/business.js';
import categoryRoutes from './routes/category.js';
import reviewRoutes from './routes/review.js';
import paymentRoutes from './routes/payment.js';
import uploadRoutes from './routes/upload.js';
import conversationRoutes from './routes/conversation.js';
import messageRoutes from './routes/message.js';
import notificationsRoutes from './routes/notifications.js';
import workProjectRoutes from './routes/workProject.js';
import workUpdateRoutes from './routes/workUpdate.js';
import locationRoutes from './routes/location.js';
import countryRoutes from './routes/country.js';
import transactionRoutes from './routes/transaction.js';
import disputeRoutes from './routes/dispute.js';
import quoteRoutes from './routes/quote.js';
import subscriptionRoutes from './routes/subscription.js';
import adminRoutes from './routes/admin.js';
import favoritesRoutes from './routes/favorites.js';
import availabilityRoutes from './routes/availability.js';
import reportsRoutes from './routes/reports.js';
import analyticsRoutes from './routes/analytics.js';
import withdrawalRoutes from './routes/withdrawal.js';
import { startIdempotencyCleanup } from './jobs/cleanupIdempotency.js';
import { apiAccessLimiter } from './utils/subscriptionData.js';
import { startSubscriptionSync } from './jobs/subscriptionSync.js';

dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isProd = process.env.NODE_ENV === 'production';

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
const USE_CORS_CREDENTIALS = (process.env.CORS_CREDENTIALS || 'true') === 'true';

// Startup validation: cannot use '*' with credentials (#4.14)
if (ALLOWED_ORIGIN === '*' && USE_CORS_CREDENTIALS) {
  throw new AppError(
    500,
    'INVALID_CORS_CONFIG',
    'ALLOWED_ORIGIN cannot be "*" when CORS credentials are enabled'
  );
}

// Production env var validation
if (process.env.NODE_ENV === 'production') {
  const required = [
    ['JWT_SECRET', config.jwtSecret],
    ['DATABASE_URL', process.env.DATABASE_URL],
    ['ALLOWED_ORIGIN', ALLOWED_ORIGIN],
    ['FRONTEND_URL', process.env.FRONTEND_URL],
  ];
  const missing = required.filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    console.error(`Missing required env vars in production: ${missing.join(', ')}`);
    process.exit(1);
  }
  if (ALLOWED_ORIGIN === 'http://localhost:5173') {
    console.error('ALLOWED_ORIGIN is still set to localhost in production. Set it to your real domain.');
    process.exit(1);
  }
  if ((process.env.FRONTEND_URL || '').includes('localhost')) {
    console.error('FRONTEND_URL is still set to localhost in production. Set it to your real frontend domain.');
    process.exit(1);
  }
}

// Generate a per-request CSP nonce for inline styles (#4.23 / #4.24).
app.use((req, _res, next) => {
  req.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: [(req, res) => `'nonce-${req.cspNonce}'`, "'self'"],
        imgSrc: ["'self'", 'data:', 'https://images.unsplash.com', 'https://*.tile.openstreetmap.org'],
        connectSrc: ["'self'", ALLOWED_ORIGIN],
        frameAncestors: ["'none'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

app.use(
  cors({
    origin: ALLOWED_ORIGIN === '*' ? true : ALLOWED_ORIGIN,
    credentials: USE_CORS_CREDENTIALS,
  })
);

app.use(httpLogger);

// Paystack webhook — must be BEFORE express.json() so we still have the raw body
// for HMAC signature verification (chunk 5, review #1.1 / #1.2).
app.post(
  '/api/payments/webhook/paystack',
  express.raw({ type: 'application/json' }),
  async (req, res, next) => {
    try {
      const signature = req.headers['x-paystack-signature'];
      if (!verifyPaystackSignature(req.body, signature)) {
        req.log?.warn?.({ path: req.path }, 'Invalid Paystack signature');
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_SIGNATURE', message: 'Invalid signature' },
        });
      }

      let event;
      try {
        event = JSON.parse(req.body.toString('utf8'));
      } catch {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PAYLOAD', message: 'Invalid JSON' },
        });
      }

      // Handle transfer.success events (auto-payout completion)
      if (event.event === 'transfer.success') {
        const transferData = event.data;
        const transferRef = transferData?.reference;
        if (transferRef) {
          try {
            await prisma.withdrawalRequest.updateMany({
              where: { paystack_reference: transferRef },
              data: { status: 'completed', note: `Paystack transfer completed: ${transferRef}` },
            });
          } catch (updateErr) {
            req.log?.error?.({ err: updateErr, transferRef }, 'failed to update withdrawal on transfer.success');
          }
        }
        return res.status(200).json({ success: true, message: 'Transfer event processed' });
      }

      // Ignore non-charge events. Return 200 so Paystack doesn't retry.
      if (event.event !== 'charge.success') {
        return res.status(200).json({ success: true, message: 'Event ignored' });
      }

      const { data } = event;
      const { reference, amount, customer, metadata = {} } = data;
      const amountNaira = Number(amount) / 100;
      const userId = metadata?.userId || metadata?.user_id || customer?.id;

      if (!userId) {
        req.log?.error?.({ event }, 'Paystack webhook missing user_id in metadata and customer.id');
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_USER', message: 'user_id required' },
        });
      }

      // Handle subscription payments
      if (metadata.purpose === 'subscription') {
        const subscriptionId = metadata.subscriptionId;
        if (!subscriptionId) {
          req.log?.error?.({ metadata }, 'subscription webhook missing subscriptionId');
          return res.status(400).json({
            success: false,
            error: { code: 'MISSING_SUBSCRIPTION', message: 'subscriptionId required' },
          });
        }

        const existing = await prisma.vendorSubscription.findUnique({
          where: { id: subscriptionId },
          select: { status: true },
        });

        if (!existing) {
          req.log?.error?.({ subscriptionId }, 'subscription not found for webhook');
          return res.status(200).json({ success: true, message: 'Subscription not found' });
        }

        if (existing.status === 'active') {
          return res.status(200).json({ success: true, message: 'Already active (duplicate)' });
        }

        try {
          await prisma.vendorSubscription.update({
            where: { id: subscriptionId, status: 'pending' },
            data: { status: 'active', verified_at: new Date().toISOString() },
          });
        } catch (updateErr) {
          req.log?.error?.({ err: updateErr, subscriptionId }, 'failed to activate subscription via webhook');
          return res.status(500).json({
            success: false,
            error: { code: 'ACTIVATION_FAILED', message: 'Failed to activate subscription' },
          });
        }

        sendNotification({
          userId,
          type: 'subscription_activated',
          title: 'Subscription activated',
          body: `Your ${metadata.packageName || ''} subscription is now active!`,
          data: { subscriptionId, reference },
          link: '/vendor/dashboard',
        }).catch((err) => req.log?.warn?.({ err }, 'subscription_activated notification failed'));

        // Email a subscription payment receipt (no-op if SMTP not configured).
        prisma.profile.findUnique({ where: { id: userId }, select: { email: true, full_name: true } })
          .then((p) => {
            if (p?.email) {
              sendSubscriptionReceipt({
                email: p.email,
                name: p.full_name || '',
                packageName: metadata.packageName || 'Subscription',
                billingCycle: metadata.billingCycle || '',
                amount: amountNaira,
                reference,
              }).catch((err) => req.log?.warn?.({ err }, 'subscription receipt email failed'));
            }
          })
          .catch(() => {});

        return res.status(200).json({ success: true, message: 'Subscription activated' });
      }

      // ——— Wallet deposit ———

      // Ensure the wallet row exists before atomicWalletCredit (which raises
      // wallet_not_found otherwise). Auto-create with zero balance on first deposit.
      const existingWallet = await prisma.wallet.findUnique({ where: { user_id: userId } });

      if (!existingWallet) {
        try {
          await prisma.wallet.create({ data: { user_id: userId, balance: 0 } });
        } catch (createErr) {
          if (createErr?.code !== 'P2002') {
            req.log?.error?.({ err: createErr, userId }, 'wallet auto-create failed in webhook');
            return res.status(500).json({
              success: false,
              error: { code: 'WALLET_CREATE_FAILED', message: 'Failed to create wallet' },
            });
          }
        }
      }

      // Idempotent credit via atomicWalletCredit. The unique partial index on
      // (reference_id, reference_type) guarantees Paystack retries cannot
      // double-credit.
      let creditResult;
      try {
        creditResult = await atomicWalletCredit({
          userId,
          amount: amountNaira,
          referenceId: reference,
          referenceType: 'paystack_deposit',
          description: `Wallet deposit via Paystack (${reference})`,
        });
      } catch (creditErr) {
        req.log?.error?.({ err: creditErr, reference }, 'atomicWalletCredit failed');
        return res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to credit wallet' },
        });
      }

      if (creditResult.duplicate) {
        // duplicate webhook delivery. Don't notify again.
        return res.status(200).json({ success: true, message: 'Webhook processed (duplicate)' });
      }

      // New credit just happened — notify the user.
      // Fire-and-forget: sendNotification never throws, so this is safe to not await.
      sendNotification({
        userId,
        type: 'deposit_success',
        title: 'Deposit successful',
        body: `Your wallet has been credited with ₦${Number(amountNaira).toLocaleString()}.`,
        data: { amount: amountNaira, reference },
        link: '/dashboard',
      }).catch((err) => req.log?.warn?.({ err }, 'deposit_success notification failed'));

      // Email a deposit receipt (no-op if SMTP not configured).
      prisma.profile.findUnique({ where: { id: userId }, select: { email: true, full_name: true } })
        .then((p) => {
          if (p?.email) {
            sendDepositConfirmation({
              email: p.email,
              name: p.full_name || '',
              amount: amountNaira,
              balance: creditResult.balance ?? 0,
            }).catch((err) => req.log?.warn?.({ err }, 'deposit receipt email failed'));
          }
        })
        .catch(() => {});

      return res.status(200).json({ success: true, message: 'Webhook processed' });
    } catch (err) {
      return next(err);
    }
  }
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Note: file downloads are served via auth-gated /api/files/:fileId route
// (added in chunk 9 by uploadController). The previous static `/uploads`
// serve is intentionally removed (#4.11).

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  keyGenerator: (req) => {
    // Prefer authenticated user ID; fall back to IP
    return req.user?.id || ipKeyGenerator(req.ip);
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' } }
});
app.use('/api/', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 10 : 200,
  keyGenerator: (req) => {
    return req.body?.email || ipKeyGenerator(req.ip);
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' } }
});
app.use('/api/auth/', authLimiter);

// Serve uploaded files from outside webroot, auth-gated via /api/files/:id (#4.11)
const uploadsDir = path.resolve(__dirname, '..', '..', 'var', 'uploads');

app.use('/api/auth', authRoutes);
// Per-vendor API entitlement limiter: vendors with an `api_access` plan
// (Enterprise) get a high ceiling; others get the standard tier. Mounted on
// the programmatic API surface so the advertised `api_access` feature is
// actually enforced by rate limits.
const apiTierLimiter = apiAccessLimiter();
app.use('/api/businesses', apiTierLimiter, businessRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/conversations', apiTierLimiter, conversationRoutes);
app.use('/api/messages', apiTierLimiter, messageRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/work-projects', workProjectRoutes);
app.use('/api/work-updates', workUpdateRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/countries', countryRoutes);
app.use('/api/transactions', apiTierLimiter, transactionRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/quotes', apiTierLimiter, quoteRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/businesses', availabilityRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/wallet/withdrawals', withdrawalRoutes);

// Keep uploadsDir referenced so the directory is created on first run if missing.
import { mkdirSync } from 'fs';
try {
  mkdirSync(uploadsDir, { recursive: true });
} catch (err) {
  logger.warn?.({ err }, 'failed to ensure uploads directory');
}

// 404 handler (must come before errorHandler)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Cannot ${req.method} ${req.originalUrl}` },
  });
});

// SECURITY: Admin routes are mounted via routes/admin.js which applies authorize('admin') middleware.
// If you add a new admin route, ensure it's registered through routes/admin.js, not directly here.

// Standardized error handler — last middleware.
app.use(errorHandler);

process.on('unhandledRejection', (reason) => {
  logger.error?.({ err: reason instanceof Error ? reason : new Error(String(reason)) }, 'Unhandled promise rejection');
});

const PORT = config.port;
if (process.env.NODE_ENV !== 'test') {
  startIdempotencyCleanup({ runImmediately: true });
  startSubscriptionSync({ runImmediately: true });
}
app.listen(PORT, () => {
  logger.info({ port: PORT }, `Server running on port ${PORT}`);
  connectDB();
});
