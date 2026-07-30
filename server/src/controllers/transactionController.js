import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { readPlatformConfig } from '../utils/platformConfig.js';
import { getMilestones, setMilestones, updateMilestoneStatus, getNextPendingMilestone } from '../utils/escrowMilestones.js';
import { AppError, sanitizeError } from '../middleware/errorHandler.js';
import { sendNotification } from '../utils/notifications.js';
import { paginate } from '../utils/shared.js';
import { holdEscrow, releaseMilestoneToVendor } from '../utils/wallet.js';
import { sendMilestoneReleaseReceipt } from '../utils/email.js';

export async function createTransaction(req, res, next) {
  try {
    const customerId = req.user.id;
    const { businessId, amount, conversationId, quoteId } = req.body;

    // Input validation is handled by zod schema in the route layer.
    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return next(new AppError(400, 'INVALID_AMOUNT', 'Amount must be a positive number.'));
    }

    const feeConfig = readPlatformConfig();
    const platformFee = parseFloat(
      (parsedAmount * (feeConfig.platformFeePercent / 100)).toFixed(2)
    );

    let transaction;
    try {
      transaction = await holdEscrow({
        customerId,
        businessId,
        amount: parsedAmount,
        platformFee,
        conversationId: conversationId ?? null,
        quoteId: quoteId ?? null,
      });
    } catch (err) {
      const msg = err.message || '';
      const code = err.code || '';
      if (code === 'P0001' && /insufficient_balance/i.test(msg)) {
        return next(new AppError(400, 'INSUFFICIENT_BALANCE', 'Insufficient wallet balance.'));
      }
      if (code === 'P0001' && /self_transaction_forbidden/i.test(msg)) {
        return next(new AppError(400, 'SELF_TRANSACTION_FORBIDDEN', 'You cannot create a transaction for your own business.'));
      }
      if (code === 'P0002' && /wallet_not_found/i.test(msg)) {
        return next(new AppError(404, 'WALLET_NOT_FOUND', 'Wallet not found.'));
      }
      if (code === 'P0002' && /business_not_found/i.test(msg)) {
        return next(new AppError(404, 'BUSINESS_NOT_FOUND', 'Business not found.'));
      }
      return next(new AppError(500, 'DB_ERROR', sanitizeError(err)));
    }

    // Hydrate the response with joins the client expects (kept identical to
    // the old response shape so client code doesn't change).
    let hydrated;
    try {
      hydrated = await prisma.transaction.findUnique({
        where: { id: transaction.id },
        include: {
          business: { select: { name: true } },
          customer: { select: { full_name: true } },
          vendor: { select: { full_name: true } },
        },
      });
    } catch (hydrateErr) {
      // The hold succeeded; return the bare row even if join fails.
      return res.status(201).json({ success: true, data: transaction });
    }

    return res.status(201).json({ success: true, data: hydrated });
  } catch (err) {
    next(err);
  }
}

export async function getMyTransactions(req, res, next) {
  try {
    const userId = req.user.id;
    const { status } = req.query;
    const { page, limit } = req.query || {};
    const { page: p, limit: l, offset } = paginate(page, limit);

    const where = {
      OR: [{ customer_id: userId }, { vendor_id: userId }],
    };
    if (status) where.status = status;

    const [data, count] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          business: { select: { name: true, slug: true, images: true } },
          customer: { select: { full_name: true } },
          vendor: { select: { full_name: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: l,
      }),
      prisma.transaction.count({ where }),
    ]);

    return res.json({ success: true, data, total: count || 0, page: p, limit: l });
  } catch (err) { next(err); }
}

export async function completeTransaction(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (!tx) return next(new AppError(404, 'NOT_FOUND', 'Transaction not found.'));
    if (tx.vendor_id !== userId) {
      return next(new AppError(403, 'FORBIDDEN', 'Only the vendor can mark a transaction as complete.'));
    }
    if (!['escrow', 'disputed'].includes(tx.status)) {
      return next(
        new AppError(400, 'INVALID_STATE', `Cannot complete transaction in status '${tx.status}'.`)
      );
    }

    // All milestones must be 'completed' or 'released' before the transaction
    // can transition to 'completed'. Funds are NOT auto-released here —
    // that happens in confirmMilestone (customer action) or releaseEscrow
    // (admin action). Review #5.11 fix.
    const msList = await prisma.escrowMilestone.findMany({ where: { transaction_id: id } });
    const milestones = msList || [];
    if (milestones.length === 0) {
      return next(
        new AppError(400, 'NO_MILESTONES', 'Transaction has no milestones.')
      );
    }
    const allClosed = milestones.every(
      (m) => m.status === 'completed' || m.status === 'released'
    );
    if (!allClosed) {
      return next(
        new AppError(
          400,
          'PENDING_MILESTONES',
          'All milestones must be released before transaction can complete.'
        )
      );
    }

    const data = await prisma.transaction.update({
      where: { id },
      data: {
        status: 'completed',
        completed_at: new Date(),
        updated_at: new Date(),
      },
      include: {
        business: { select: { name: true } },
        customer: { select: { full_name: true } },
        vendor: { select: { full_name: true } },
      },
    });

    // Notify both customer and vendor that the transaction is complete.
    // Promise.all = parallel dispatch; sendNotification never throws.
    await Promise.all([
      sendNotification({
        userId: tx.customer_id,
        type: 'transaction_completed',
        title: 'Service completed',
        body: 'Your service has been marked complete. Thanks for using TaskNija.',
        data: { transactionId: id },
        link: `/transactions/${id}`,
      }),
      sendNotification({
        userId: tx.vendor_id,
        type: 'transaction_completed',
        title: 'Transaction completed',
        body: 'The customer has confirmed the service is complete.',
        data: { transactionId: id },
        link: `/transactions/${id}`,
      }),
    ]);

    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function raiseDispute(req, res, next) {
  try {
    const { transactionId, reason, description } = req.body;
    const userId = req.user.id;

    if (!transactionId || !reason) {
      return res.status(400).json({ success: false, error: 'Transaction ID and reason are required' });
    }

    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { business: { select: { id: true, name: true } } },
    });
    if (!tx) return res.status(404).json({ success: false, error: 'Transaction not found' });

    const isCustomer = tx.customer_id === userId;
    const isVendor = tx.vendor_id === userId;
    if (!isCustomer && !isVendor) {
      return res.status(403).json({ success: false, error: 'Not a participant in this transaction' });
    }

    const raisedAgainst = isCustomer ? tx.vendor_id : tx.customer_id;

    const dispute = await prisma.dispute.create({
      data: {
        transaction_id: transactionId,
        business_id: tx.business_id,
        raised_by: userId,
        raised_against: raisedAgainst,
        reason,
        description: description || '',
        status: 'open',
      },
      include: {
        transaction: { select: { amount: true, status: true } },
        raisedBy: { select: { full_name: true } },
      },
    });

    // Update transaction status to disputed
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: 'disputed', updated_at: new Date() },
    }).catch(() => {});

    return res.status(201).json({ success: true, data: dispute });
  } catch (err) { next(err); }
}

export async function getMyDisputes(req, res, next) {
  try {
    const userId = req.user.id;

    const data = await prisma.dispute.findMany({
      where: {
        OR: [{ raised_by: userId }, { raised_against: userId }],
      },
      include: {
        transaction: { select: { amount: true, status: true } },
        business: { select: { name: true } },
        raisedBy: { select: { full_name: true } },
        raisedAgainst: { select: { full_name: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

/* ---- Milestone-based escrow ---- */

export async function getTransactionMilestones(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (!tx) return res.status(404).json({ success: false, error: 'Transaction not found' });
    if (tx.customer_id !== userId && tx.vendor_id !== userId) {
      return res.status(403).json({ success: false, error: 'Not a participant in this transaction' });
    }

    const milestones = await getMilestones(id);
    return res.json({ success: true, data: milestones });
  } catch (err) { next(err); }
}

export async function completeMilestone(req, res, next) {
  try {
    const { id, milestoneId } = req.params;
    const userId = req.user.id;

    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (!tx) return res.status(404).json({ success: false, error: 'Transaction not found' });
    if (tx.vendor_id !== userId) {
      return res.status(403).json({ success: false, error: 'Only the vendor can complete milestones' });
    }

    const milestones = await getMilestones(id);
    const ms = milestones.find(m => m.id === milestoneId);
    if (!ms) return res.status(404).json({ success: false, error: 'Milestone not found' });
    if (ms.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Milestone is not pending' });
    }

    const updated = await updateMilestoneStatus(id, milestoneId, 'completed');
    return res.json({ success: true, data: updated });
  } catch (err) { next(err); }
}

export async function confirmMilestone(req, res, next) {
  try {
    const { id, milestoneId } = req.params;
    const userId = req.user.id;

    // Fetch transaction.
    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (!tx) return next(new AppError(404, 'NOT_FOUND', 'Transaction not found.'));

    // Controller-side authorization: only the customer on the transaction
    // can confirm a milestone.
    if (tx.customer_id !== userId) {
      return next(
        new AppError(403, 'FORBIDDEN', 'Only the customer can confirm milestone completion.')
      );
    }

    // Fetch milestone (scoped by transaction).
    const ms = await prisma.escrowMilestone.findFirst({
      where: { id: milestoneId, transaction_id: id },
    });
    if (!ms) {
      return next(new AppError(404, 'NOT_FOUND', 'Milestone not found.'));
    }

    // State guard: milestone must be 'completed' (vendor marked work done).
    if (ms.status !== 'completed') {
      return next(
        new AppError(
          400,
          'INVALID_STATE',
          `Cannot confirm milestone in status '${ms.status}'.`
        )
      );
    }

    // Atomic release: credits the vendor wallet and marks the milestone 'released'.
    const releasedMilestone = await releaseMilestoneToVendor({ milestoneId });

    // Roll the milestone's platform fee into the transaction's running total.
    const newFeeTotal =
      parseFloat(tx.platform_fee || 0) + parseFloat(ms.platform_fee || 0);
    const updatedTx = await prisma.transaction.update({
      where: { id },
      data: {
        platform_fee: newFeeTotal,
        updated_at: new Date(),
      },
    });

    // Notify the vendor that this milestone has been released to their wallet.
    await sendNotification({
      userId: tx.vendor_id,
      type: 'milestone_released',
      title: 'Milestone released',
      body: 'A milestone payment has been released to your wallet.',
      data: { transactionId: id, milestoneId },
      link: `/transactions/${id}`,
    });

    // Email a payment receipt to the vendor for the released milestone.
    const net = parseFloat(ms.amount) - parseFloat(ms.platform_fee || 0);
    try {
      const vendorProfile = await prisma.profile.findUnique({
        where: { id: tx.vendor_id },
        select: { email: true, full_name: true },
      });
      if (vendorProfile?.email) {
        await sendMilestoneReleaseReceipt({
          email: vendorProfile.email,
          name: vendorProfile.full_name || 'Vendor',
          amount: ms.amount,
          fee: ms.platform_fee || 0,
          net,
          transactionId: id,
          milestoneTitle: ms.title || `Milestone ${ms.index ?? ''}`.trim(),
        });
      }
    } catch (mailErr) {
      req.log?.warn?.({ err: mailErr }, 'milestone release receipt email failed');
    }

    // If all milestones are now released, transition the transaction to
    // 'completed'.
    const msList = await prisma.escrowMilestone.findMany({ where: { transaction_id: id } });
    const allReleased =
      (msList || []).length > 0 &&
      (msList || []).every((m) => m.status === 'released');
    if (allReleased) {
      await prisma.transaction.update({
        where: { id },
        data: {
          status: 'completed',
          completed_at: new Date(),
          updated_at: new Date(),
        },
      });
    }

    req.log?.info?.(
      {
        vendorId: tx.vendor_id,
        milestoneId,
        gross: ms.amount,
        fee: ms.platform_fee,
        net: parseFloat(ms.amount) - parseFloat(ms.platform_fee || 0),
      },
      'milestone.released'
    );

    return res.json({
      success: true,
      data: { milestone: releasedMilestone, transaction: updatedTx },
    });
  } catch (err) {
    next(err);
  }
}
