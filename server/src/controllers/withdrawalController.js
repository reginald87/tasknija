/**
 * Withdrawal controllers (chunk 8b).
 *
 *   GET  /api/wallet/withdrawals              -> list
 *   POST /api/wallet/withdrawals              -> createRequest
 *   PATCH /api/wallet/withdrawals/:id/approve -> approve (admin)
 *   PATCH /api/wallet/withdrawals/:id/reject  -> reject (admin)
 *
 * Uses the chunk-7 `withdrawalRequests.js` helpers (listForUser/getById/create/updateStatus).
 */

import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { logAdminAction } from '../utils/adminAudit.js';
import { listForUser, listAll, getById, create, updateStatus } from '../utils/withdrawalRequests.js';
import { notify } from '../utils/notifications.js';
import { createTransferRecipient, initiateTransfer, resolveAccountNumber } from '../utils/paystack.js';
import { atomicWalletUpdate } from '../utils/wallet.js';
import { sendWithdrawalApproved, sendWithdrawalRejected } from '../utils/email.js';
import { logger } from '../middleware/logger.js';

async function sendWithdrawalEmail(recipientId, fn) {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: recipientId },
      select: { email: true, full_name: true },
    });
    if (profile?.email) await fn(profile.email, profile.full_name || 'User');
  } catch (mailErr) {
    logger.warn?.({ err: mailErr }, 'withdrawal email failed');
  }
}

export async function list(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await listForUser(req.user.id, {
      page: Number(page),
      limit: Math.min(Number(limit), 100),
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function adminList(req, res, next) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const result = await listAll({
      status: status || null,
      page: Number(page),
      limit: Math.min(Number(limit), 100),
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function createRequest(req, res, next) {
  try {
    const { amount, bankAccount, bankCode } = req.body || {};
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 1000) {
      throw new AppError(400, 'MIN_AMOUNT', 'Minimum withdrawal is NGN 1,000.');
    }
    if (!bankAccount || !bankCode) {
      throw new AppError(400, 'MISSING_BANK', 'bankAccount and bankCode are required.');
    }

    // Atomically debit the wallet. If balance insufficient, function raises.
    try {
      await atomicWalletUpdate({
        userId: req.user.id,
        delta: -amt,
        kind: 'withdrawal_hold',
      });
    } catch (err) {
      if (/insufficient/i.test(err.message || '')) {
        throw new AppError(400, 'INSUFFICIENT_BALANCE', 'Insufficient wallet balance.');
      }
      throw err;
    }

    let request;
    try {
      request = await create({
        userId: req.user.id,
        amount: amt,
        bankAccount,
        bankCode,
      });
    } catch (err) {
      // Rollback the debit if the request insert fails (best-effort).
      await atomicWalletUpdate({
        userId: req.user.id,
        delta: amt,
        kind: 'withdrawal_hold_rollback',
      }).catch(() => {});
      throw err;
    }

    // Fire-and-forget notification
    notify('withdrawal.requested', {
      userId: req.user.id,
      payload: { amount: amt },
      referenceId: request.id,
    }).catch(() => {});

    return res.status(201).json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
}

export async function approve(req, res, next) {
  try {
    const { id } = req.params;
    const { note } = req.body || {};
    const w = await getById(id);
    if (w.status !== 'pending') {
      throw new AppError(400, 'INVALID_STATE', `Cannot approve withdrawal in status '${w.status}'.`);
    }

    const paystackKey = process.env.PAYMENT_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY || '';
    let paystackReference = null;

    if (paystackKey) {
      // Resolve account name, create transfer recipient, initiate payout
      try {
        const accountName = w.account_name || w.accountName || 'Vendor';
        const accountNumber = w.account_number || w.accountNumber;
        const bankCode = w.bank_code || w.bankCode;

        if (accountNumber && bankCode) {
          // Resolve account to confirm it's valid
          const resolved = await resolveAccountNumber(accountNumber, bankCode);

          // Create transfer recipient
          const recipient = await createTransferRecipient({
            name: resolved?.data?.account_name || accountName,
            accountNumber,
            bankCode,
          });

          if (recipient?.status && recipient?.data?.recipient_code) {
            // Initiate transfer
            const transfer = await initiateTransfer({
              amount: Number(w.amount),
              recipientCode: recipient.data.recipient_code,
              reason: `TaskNija withdrawal: ${note || 'Payout'}`,
            });

            if (transfer?.status && transfer?.data?.reference) {
              paystackReference = transfer.data.reference;
            }
          }
        }
      } catch (paystackErr) {
        req.log?.warn?.({ err: paystackErr, withdrawalId: id }, 'Paystack auto-payout failed, proceeding with manual');
      }
    }

    const updated = await updateStatus(id, paystackReference ? 'completed' : 'approved', req.user.id, note || null);
    await logAdminAction(req.user.id, 'approve_withdrawal', 'withdrawal_request', id, {
      amount: w.amount,
      paystackReference,
    });

    notify('withdrawal.processed', {
      userId: w.user_id,
      payload: { amount: w.amount },
      referenceId: id,
    }).catch(() => {});

    sendWithdrawalEmail(w.user_id, (email, name) =>
      sendWithdrawalApproved({
        email,
        name,
        amount: w.amount,
        bankName: w.bank_name || '',
        accountNumber: w.account_number || w.accountNumber || '',
      })
    );

    return res.json({ success: true, data: { ...updated, paystack_reference: paystackReference } });
  } catch (err) {
    next(err);
  }
}

export async function reject(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const w = await getById(id);
    if (w.status !== 'pending') {
      throw new AppError(400, 'INVALID_STATE', `Cannot reject withdrawal in status '${w.status}'.`);
    }

    // Refund the user (the funds were debited when request was created).
    await atomicWalletUpdate({
      userId: w.user_id,
      delta: Number(w.amount),
      kind: 'withdrawal_refund',
    });

    const updated = await updateStatus(id, 'rejected', req.user.id, reason || null);
    await logAdminAction(req.user.id, 'reject_withdrawal', 'withdrawal_request', id, {
      reason: reason || null,
    });

    sendWithdrawalEmail(w.user_id, (email, name) =>
      sendWithdrawalRejected({
        email,
        name,
        amount: w.amount,
        reason: reason || null,
      })
    );

    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}
