/**
 * Dispute controllers (chunk 8b).
 *
 *   GET  /api/disputes                       -> list (admin)
 *   GET  /api/disputes/mine                  -> listMine
 *   POST /api/disputes/transactions/:txId    -> raise
 *   PATCH /api/disputes/:id/resolve          -> resolve (admin)
 *
 * Schema notes:
 *   - disputes.status CHECK allows (open, reviewing, resolved, dismissed).
 *     The spec's resolve() accepts resolved_customer|resolved_vendor|closed.
 *     We map closed -> dismissed (closest existing value) and stored the
 *     original intent in `resolution` (free-text) for audit.
 *   - disputes has no `admin_note` column in schema.sql; we store the note in
 *     `resolution` to keep the diff minimal (chunk 17 may add a dedicated column).
 *   - The notifications table may not exist yet — all notify() calls are
 *     non-blocking and gracefully degrade.
 */

import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { logAdminAction } from '../utils/adminAudit.js';
import { notify } from '../utils/notifications.js';
import { sanitizeText } from '../utils/sanitize.js';
import { atomicWalletUpdate } from '../utils/wallet.js';

const RESOLUTION_STATUS_MAP = {
  resolved_customer: 'resolved',
  resolved_vendor: 'resolved',
  closed: 'dismissed',
};

export async function raise(req, res, next) {
  try {
    const { transactionId } = req.params;
    const { evidence } = req.body || {};
    // Sanitize UGC field (reason) before any persistence.
    const reason = sanitizeText(req.body?.reason);
    if (!reason || reason.length < 10) {
      throw new AppError(400, 'INVALID_REASON', 'Reason must be at least 10 characters.');
    }

    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: { customer_id: true, vendor_id: true, status: true, amount: true },
    });
    if (!tx) {
      throw new AppError(404, 'NOT_FOUND', 'Transaction not found.');
    }
    if (req.user.id !== tx.customer_id && req.user.id !== tx.vendor_id) {
      throw new AppError(403, 'FORBIDDEN', 'Only transaction participants can raise disputes.');
    }

    const otherPartyId = req.user.id === tx.customer_id ? tx.vendor_id : tx.customer_id;

    const data = await prisma.dispute.create({
      data: {
        transaction_id: transactionId,
        raised_by: req.user.id,
        raised_against: otherPartyId,
        reason: String(reason),
        description: Array.isArray(evidence) && evidence.length
          ? `Evidence: ${evidence.join(', ')}`
          : null,
        status: 'open',
      },
    });

    // Move transaction to disputed (best-effort).
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: 'disputed' },
    }).catch(() => {});

    notify('dispute.raised', {
      userId: otherPartyId,
      payload: { transactionId, reason: String(reason).slice(0, 120) },
      referenceId: data.id,
    }).catch(() => {});

    return res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function list(req, res, next) {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (safePage - 1) * safeLimit;

    const where = {};
    if (status) where.status = status;

    const [data, count] = await Promise.all([
      prisma.dispute.findMany({
        where,
        include: {
          transaction: true,
          raisedBy: { select: { full_name: true, email: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: safeLimit,
      }),
      prisma.dispute.count({ where }),
    ]);

    return res.json({ success: true, data: data || [], total: count || 0, page: safePage, limit: safeLimit });
  } catch (err) {
    next(err);
  }
}

export async function resolve(req, res, next) {
  try {
    const { id } = req.params;
    const { resolution, admin_note } = req.body || {};
    if (!Object.prototype.hasOwnProperty.call(RESOLUTION_STATUS_MAP, resolution)) {
      throw new AppError(
        400,
        'INVALID_RESOLUTION',
        'resolution must be one of resolved_customer|resolved_vendor|closed'
      );
    }

    const status = RESOLUTION_STATUS_MAP[resolution];
    // Store the original resolution intent + admin note in the `resolution` text
    // column (schema has no admin_note column).
    const resolutionText = admin_note
      ? `${resolution}: ${String(admin_note).slice(0, 500)}`
      : resolution;

    const data = await prisma.dispute.update({
      where: { id },
      data: {
        status,
        resolution: resolutionText,
        resolved_by: req.user.id,
        resolved_at: new Date(),
      },
    });

    await logAdminAction(req.user.id, 'resolve_dispute', 'dispute', id, {
      resolution,
      admin_note: admin_note || null,
    });

    // If resolved in customer's favor, refund the customer's wallet
    const disputeWithTx = await prisma.dispute.findUnique({
      where: { id },
      include: { transaction: { select: { customer_id: true, vendor_id: true, amount: true } } },
    });

    const txData = disputeWithTx?.transaction;
    if (txData) {
      if (resolution === 'resolved_customer') {
        await atomicWalletUpdate({
          userId: txData.customer_id,
          delta: Number(txData.amount),
          kind: 'refund',
        }).catch(() => {});
        await prisma.transaction.update({
          where: { id: data.transaction_id },
          data: { status: 'cancelled', updated_at: new Date() },
        });
      } else if (resolution === 'resolved_vendor') {
        await atomicWalletUpdate({
          userId: txData.vendor_id,
          delta: Number(txData.amount),
          kind: 'escrow_release',
        }).catch(() => {});
        await prisma.transaction.update({
          where: { id: data.transaction_id },
          data: { status: 'completed', updated_at: new Date() },
        });
      }
    }

    notify('dispute.resolved', {
      userId: data.raised_by,
      payload: { transactionId: data.transaction_id },
      referenceId: id,
    }).catch(() => {});

    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function listMine(req, res, next) {
  try {
    // Get transaction IDs the user participates in, then fetch disputes for those.
    const txs = await prisma.transaction.findMany({
      where: { OR: [{ customer_id: req.user.id }, { vendor_id: req.user.id }] },
      select: { id: true },
    });

    const txIds = (txs || []).map((t) => t.id);
    if (txIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const data = await prisma.dispute.findMany({
      where: {
        OR: [{ raised_by: req.user.id }, { transaction_id: { in: txIds } }],
      },
      include: { transaction: true },
      orderBy: { created_at: 'desc' },
    });

    return res.json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
}
