import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { initializeDeposit as psInitializeDeposit, verifyPayment } from '../utils/paystack.js';
import { atomicWalletUpdate, atomicWalletCredit } from '../utils/wallet.js';
import {
  sendWithdrawalRequestNotification,
  sendDepositConfirmation,
} from '../utils/email.js';

/* ------------------------------------------------------------------ */
/* Zod schemas                                                          */
/* ------------------------------------------------------------------ */

export const initializeDepositSchema = z.object({
  amount: z.coerce.number().positive().min(100).max(10_000_000),
  channel: z.enum(['card', 'bank', 'ussd', 'mobile_money']).optional(),
}).strict();

// Map the client's selected payment method to Paystack's `channels` param.
// Channels supported by this Paystack account. `mobile_money` and `ussd`
// are unavailable on standard NG test accounts, so we omit them and let
// Paystack fall back to its default enabled channels (card / bank_transfer).
const CHANNEL_MAP = {
  card: ['card'],
  bank: ['bank_transfer'],
};

export const verifyDepositSchema = z.object({
  reference: z.string().min(1).max(200),
}).strict();

export const requestWithdrawalSchema = z.object({
  amount: z.coerce.number().positive().min(1000),
  bank_account: z.string().min(6).max(20),
  bank_code: z.string().min(3).max(20),
  bank_name: z.string().min(2).max(100).optional(),
  account_name: z.string().min(2).max(200).optional(),
}).strict();

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

/* ------------------------------------------------------------------ */
/* Wallet endpoints                                                     */
/* ------------------------------------------------------------------ */

/**
 * GET /api/payments/wallet — return the current user's wallet.
 */
export async function getBalance(req, res, next) {
  try {
    const userId = req.user.id;

    let wallet = await prisma.wallet.findUnique({ where: { user_id: userId } });

    // Auto-create a wallet on first read.
    if (!wallet) {
      wallet = await prisma.wallet.create({ data: { user_id: userId, balance: 0 } });
    }

    return res.json({ success: true, data: { balance: Number(wallet.balance) || 0, wallet } });
  } catch (err) {
    return next(err);
  }
}

/* ------------------------------------------------------------------ */
/* Deposit (Paystack)                                                   */
/* ------------------------------------------------------------------ */

function makeDepositReference() {
  return `DEP-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * POST /api/payments/deposit/initialize
 * Initialize a Paystack transaction and persist a pending record.
 */
export async function initializeDeposit(req, res, next) {
  try {
    const { amount } = req.body;
    const userId = req.user.id;

    // Look up the user's email for the Paystack charge.
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    const email = profile?.email || req.user.email;
    if (!email) {
      throw new AppError(400, 'MISSING_EMAIL', 'User email is required to initialize a deposit');
    }

    const reference = makeDepositReference();

    const channels = CHANNEL_MAP[req.body.channel];
    const response = await psInitializeDeposit({
      email,
      amount,
      reference,
      userId,
      channels,
    });

    if (!response || !response.status) {
      // Paystack returns { status: false, message: '...' } on failure.
      const reason = response?.message || 'Payment initialization failed';
      if (response?.httpStatus === 401) {
        throw new AppError(500, 'PAYSTACK_UNAUTHORIZED', 'Payment provider authentication failed. Check PAYSTACK_SECRET_KEY.');
      }
      throw new AppError(502, 'PAYSTACK_INIT_FAILED', reason);
    }

    return res.json({
      success: true,
      data: {
        authorizationUrl: response.data.authorization_url,
        reference: response.data.reference,
      },
    });
  } catch (err) {
    if (err instanceof AppError) return next(err);
    return next(new AppError(502, 'PAYSTACK_INIT_FAILED', err?.message || 'Payment initialization failed'));
  }
}

/**
 * GET /api/payments/deposit/verify?reference=...
 * Verify a deposit with Paystack and credit the wallet idempotently.
 */
export async function verifyDepositPayment(req, res, next) {
  try {
    const { reference } = req.query;
    if (!reference) {
      throw new AppError(400, 'MISSING_REFERENCE', 'reference is required');
    }

    const response = await verifyPayment(reference);
    if (!response || !response.status) {
      throw new AppError(502, 'PAYSTACK_VERIFY_FAILED', response?.message || 'Payment verification failed');
    }

    const { data } = response;

    if (data.status !== 'success') {
      return res.json({
        success: true,
        data: { status: data.status, message: `Payment status: ${data.status}` },
      });
    }

    // Paystack returns amount in kobo (smallest currency unit).
    const amountNaira = Number(data.amount) / 100;
    const userId = data.metadata?.userId || req.user.id;

    // Atomic + idempotent credit. On duplicate it does NOT throw; we get back
    // { duplicate: true } with the current wallet.
    const credit = await atomicWalletCredit({
      userId,
      amount: amountNaira,
      referenceId: reference,
      referenceType: 'paystack_deposit',
      description: `Wallet deposit via Paystack (${reference})`,
    });

    const updatedWallet = await prisma.wallet.findUnique({ where: { user_id: userId } });

    // Best-effort confirmation email.
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: userId },
        select: { email: true, full_name: true },
      });
      if (profile?.email) {
        await sendDepositConfirmation({
          email: profile.email,
          name: profile.full_name || 'User',
          amount: amountNaira,
          balance: Number(updatedWallet?.balance || 0),
        });
      }
    } catch (mailErr) {
      req.log?.warn?.({ err: mailErr }, 'deposit confirmation email failed');
    }

    return res.json({
      success: true,
      data: {
        status: 'success',
        amount: amountNaira,
        reference,
        wallet: updatedWallet,
        transaction: credit.duplicate ? null : credit,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/* ------------------------------------------------------------------ */
/* Withdrawal requests                                                  */
/* ------------------------------------------------------------------ */

/**
 * POST /api/payments/withdrawals
 * Debit the wallet atomically and create a withdrawal request for admin approval.
 */
export async function requestWithdrawal(req, res, next) {
  try {
    const { amount, bank_account, bank_code, bank_name, account_name } = req.body;
    const userId = req.user.id;

    // Atomic debit. Raises on insufficient balance or missing wallet.
    let wallet;
    try {
      wallet = await atomicWalletUpdate({
        userId,
        delta: -amount,
        kind: 'withdrawal_hold',
      });
    } catch (err) {
      if (/insufficient_balance/.test(err.message)) {
        throw new AppError(400, 'INSUFFICIENT_BALANCE', 'Insufficient wallet balance');
      }
      if (err.code === 'P0002') {
        throw new AppError(404, 'WALLET_NOT_FOUND', 'Wallet not found. Fund your wallet first.');
      }
      req.log?.error?.({ err, userId, amount }, 'atomicWalletUpdate failed');
      throw new AppError(500, 'WALLET_DEBIT_FAILED', 'Failed to debit wallet');
    }

    // Record the withdrawal request for admin review.
    const insertRow = {
      user_id: userId,
      amount,
      bank_name: bank_name || '',
      account_number: bank_account,
      account_name: account_name || '',
    };

    let withdrawal;
    try {
      withdrawal = await prisma.withdrawalRequest.create({ data: insertRow });
    } catch (insertErr) {
      // Compensate: refund the held amount if we couldn't create the request.
      try {
        await atomicWalletUpdate({
          userId,
          delta: amount,
          kind: 'withdrawal_hold_reversal',
        });
      } catch (refundErr) {
        req.log?.error?.({ err: refundErr, userId, amount }, 'failed to reverse withdrawal hold');
      }
      throw new AppError(500, 'WITHDRAWAL_CREATE_FAILED', 'Failed to create withdrawal request');
    }

    // Best-effort notification.
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: userId },
        select: { email: true, full_name: true },
      });
      if (profile?.email) {
        await sendWithdrawalRequestNotification({
          email: profile.email,
          name: profile.full_name || 'Vendor',
          amount,
          bankName: insertRow.bank_name,
          accountNumber: insertRow.account_number,
        });
      }
    } catch (mailErr) {
      req.log?.warn?.({ err: mailErr }, 'withdrawal request email failed');
    }

    return res.status(201).json({
      success: true,
      data: {
        withdrawal,
        wallet: { balance: Number(wallet.balance) },
        message: 'Withdrawal request submitted.',
      },
    });
  } catch (err) {
    return next(err);
  }
}

/* ------------------------------------------------------------------ */
/* Read-only listings                                                   */
/* ------------------------------------------------------------------ */

/**
 * GET /api/payments/wallet/transactions?page=&limit=
 * Return the current user's wallet_transactions (newest first).
 */
export async function getMyWalletTransactions(req, res, next) {
  try {
    const userId = req.user.id;
    const { page, limit } = req.query;
    const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
    const offset = (safePage - 1) * safeLimit;

    const [data, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: safeLimit,
      }),
      prisma.walletTransaction.count({ where: { user_id: userId } }),
    ]);

    return res.json({
      success: true,
      data: {
        transactions: data || [],
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          has_more: offset + (data?.length || 0) < total,
        },
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/payments/withdrawals?page=&limit=
 * Return the current user's withdrawal_requests (newest first).
 */
export async function getMyWithdrawals(req, res, next) {
  try {
    const userId = req.user.id;
    const { page, limit } = req.query;
    const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
    const offset = (safePage - 1) * safeLimit;

    const [data, total] = await Promise.all([
      prisma.withdrawalRequest.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: safeLimit,
      }),
      prisma.withdrawalRequest.count({ where: { user_id: userId } }),
    ]);

    return res.json({
      success: true,
      data: {
        withdrawals: data || [],
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          has_more: offset + (data?.length || 0) < total,
        },
      },
    });
  } catch (err) {
    return next(err);
  }
}
