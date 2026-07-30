import { prisma } from '../config/prisma.js';
import crypto from 'crypto';
import { getAllConfig, setConfig } from '../utils/platformConfig.js';
import { AppError, sanitizeError } from '../middleware/errorHandler.js';
import { logAdminAction } from '../utils/adminAudit.js';
import { releaseMilestoneToVendor, atomicWalletUpdate } from '../utils/wallet.js';
import { serializeBusiness } from '../utils/serializers.js';

async function safeCount(model, filter = {}) {
  try {
    return await prisma[model].count({ where: filter });
  } catch { return 0; }
}

async function safeSelect(model, select, options = {}) {
  try {
    const query = {
      where: options.eq || {},
      select: select ? Object.fromEntries(select.split(',').map((c) => [c.trim(), true])) : undefined,
      orderBy: options.order ? { [options.order.field]: options.order.ascending ? 'asc' : 'desc' } : undefined,
      take: options.limit,
    };
    const data = await prisma[model].findMany(query);
    return data || [];
  } catch { return []; }
}

export async function getStats(req, res, next) {
  try {
    const [totalUsers, totalBusinesses, totalCategories, totalReviews, totalTransactions, totalDisputes] = await Promise.all([
      safeCount('profile', {}),
      safeCount('business', {}),
      safeCount('category', {}),
      safeCount('review', {}),
      safeCount('transaction', {}),
      safeCount('dispute', {}),
    ]);

    const totalInflow = await safeSelect('walletTransaction', 'amount', { eq: { type: 'deposit' } });
    const inflow = totalInflow.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    const pendingData = await safeSelect('business', 'id', { eq: { verification_status: 'pending' } });
    const pendingVerifications = pendingData.length;

    const recentUsers = await safeSelect('profile', 'id, email, full_name, role, created_at', { order: { field: 'created_at' }, limit: 5 });
    const recentBusinesses = await safeSelect('business', 'id, name, city, state, verification_status, created_at', { order: { field: 'created_at' }, limit: 5 });

    return res.json({
      success: true,
      data: {
        totalUsers, totalBusinesses, totalCategories, totalReviews,
        totalTransactions, totalDisputes,
        totalInflow: inflow,
        pendingVerifications,
        recentUsers: recentUsers || [],
        recentBusinesses: recentBusinesses || [],
      },
    });
  } catch (err) { next(err); }
}

/* ---- Businesses ---- */

export async function getBusinesses(req, res, next) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    const where = {};
    if (status) where.verification_status = status;

    const [data, count] = await Promise.all([
      prisma.business.findMany({
        where,
        include: {
          owner: { select: { full_name: true, email: true, phone: true } },
          category: { select: { name: true, slug: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: from,
        take: (to - from + 1),
      }),
      prisma.business.count({ where }),
    ]);

    const serialized = (data || []).map(serializeBusiness);
    return res.json({ success: true, data: serialized, total: count });
  } catch (err) { next(err); }
}

export async function verifyBusiness(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Status must be verified or rejected' });
    }
    const data = await prisma.business.update({
      where: { id },
      data: {
        verification_status: status,
        verified_at: new Date(),
        verified_by: req.user.id,
        updated_at: new Date(),
      },
    });
    await logAdminAction(req.user.id, 'verify_business', 'business', id, { status });
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function deleteBusiness(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.business.delete({ where: { id } });
    await logAdminAction(req.user.id, 'delete_business', 'business', id);
    return res.json({ success: true, message: 'Business deleted' });
  } catch (err) { next(err); }
}

/* ---- Reviews ---- */

export async function getReviews(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    const [data, count] = await Promise.all([
      prisma.review.findMany({
        include: {
          user: { select: { full_name: true, email: true } },
          business: { select: { name: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: from,
        take: (to - from + 1),
      }),
      prisma.review.count(),
    ]);

    return res.json({ success: true, data: data || [], total: count });
  } catch (err) { next(err); }
}

export async function deleteReview(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.review.delete({ where: { id } });
    await logAdminAction(req.user.id, 'delete_review', 'review', id);
    return res.json({ success: true, message: 'Review deleted' });
  } catch (err) { next(err); }
}

/* ---- Wallets ---- */

export async function getWallets(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    const [data, count] = await Promise.all([
      prisma.wallet.findMany({
        include: {
          user: { select: { full_name: true, email: true, role: true } },
        },
        orderBy: { balance: 'desc' },
        skip: from,
        take: (to - from + 1),
      }),
      prisma.wallet.count(),
    ]);

    return res.json({ success: true, data: data || [], total: count });
  } catch (err) { next(err); }
}

export async function getWalletTransactions(req, res, next) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    const [data, count] = await Promise.all([
      prisma.walletTransaction.findMany({
        include: {
          user: { select: { full_name: true, email: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: from,
        take: (to - from + 1),
      }),
      prisma.walletTransaction.count(),
    ]);

    return res.json({ success: true, data: data || [], total: count });
  } catch (err) { next(err); }
}

/* ---- Transactions / Escrow ---- */

export async function getTransactions(req, res, next) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    const where = {};
    if (status) where.status = status;

    const [data, count] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          customer: { select: { full_name: true, email: true } },
          vendor: { select: { full_name: true, email: true } },
          business: { select: { name: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: from,
        take: (to - from + 1),
      }),
      prisma.transaction.count({ where }),
    ]);

    return res.json({ success: true, data: data || [], total: count });
  } catch (err) { next(err); }
}

export async function releaseEscrow(req, res, next) {
  try {
    const { id } = req.params;
    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (!tx) {
      return next(new AppError(404, 'NOT_FOUND', 'Transaction not found.'));
    }

    // Double-release guard (review #1.5).
    if (tx.status === 'released') {
      return next(
        new AppError(400, 'ALREADY_RELEASED', 'Transaction already released.')
      );
    }

    // Allowed source statuses (review #1.20 / #5.13). 'completed' was
    // previously accepted but is contradictory — already-released state.
    if (!['escrow', 'disputed'].includes(tx.status)) {
      return next(
        new AppError(
          400,
          'INVALID_STATUS',
          `Cannot release escrow from status '${tx.status}'.`
        )
      );
    }

    // Find eligible milestones (held or completed). Pending milestones are
    // skipped (not yet paid by customer); released/cancelled are terminal.
    const eligibleMs = await prisma.escrowMilestone.findMany({
      where: { transaction_id: id, status: { in: ['held', 'completed'] } },
    });

    // Release each eligible milestone atomically via the helper. Each call is
    // idempotent (guarded by released_at IS NULL inside the helper).
    const releasedMilestones = [];
    for (const ms of eligibleMs || []) {
      const released = await releaseMilestoneToVendor({ milestoneId: ms.id });
      releasedMilestones.push(released);
    }

    const totalReleased = releasedMilestones.reduce(
      (sum, m) =>
        sum +
        (parseFloat(m.amount) - parseFloat(m.platform_fee || 0)),
      0
    );

    // Mark transaction released.
    const updatedTx = await prisma.transaction.update({
      where: { id },
      data: {
        status: 'released',
        released_at: new Date(),
        updated_at: new Date(),
      },
    });

    await logAdminAction(
      req.user.id,
      'release_escrow',
      'transaction',
      id,
      { releasedCount: releasedMilestones.length, totalReleased }
    );

    return res.json({
      success: true,
      data: {
        transaction: updatedTx,
        releasedMilestones,
        totalReleased,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function cancelTransaction(req, res, next) {
  try {
    const { id } = req.params;
    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (!tx) {
      return next(new AppError(404, 'NOT_FOUND', 'Transaction not found.'));
    }

    if (tx.status === 'cancelled') {
      return next(
        new AppError(400, 'ALREADY_CANCELLED', 'Transaction already cancelled.')
      );
    }
    if (tx.status === 'released' || tx.status === 'completed') {
      return next(
        new AppError(
          400,
          'INVALID_STATUS',
          `Cannot cancel transaction in status '${tx.status}'.`
        )
      );
    }

    // Review #1.6: refund only milestones in 'held' (customer paid, vendor
    // not yet credited). Skip 'pending' (not yet paid) and 'released'
    // (already paid to vendor).
    const heldMs = await prisma.escrowMilestone.findMany({
      where: { transaction_id: id, status: 'held' },
    });

    const refundedMilestones = [];
    let totalRefunded = 0;
    const nowIso = new Date();
    for (const ms of heldMs || []) {
      // Mark milestone cancelled before refunding (so the state machine is
      // consistent even if the refund helper retries later).
      const cancelled = await prisma.escrowMilestone.update({
        where: { id: ms.id },
        data: {
          status: 'cancelled',
          cancelled_at: nowIso,
          updated_at: nowIso,
        },
      });

      // Atomic refund via helper. Raises on wallet_missing; the controller
      // propagates the error (no silent failures).
      try {
        await atomicWalletUpdate({
          userId: tx.customer_id,
          delta: parseFloat(ms.amount),
          kind: 'cancellation_refund',
        });
      } catch (refundErr) {
        req.log?.error?.(
          { err: refundErr, msId: ms.id, amount: ms.amount, txId: id },
          'cancellation_refund_failed'
        );
        throw refundErr;
      }

      refundedMilestones.push({
        ...cancelled,
        status: 'cancelled',
        cancelled_at: nowIso,
      });
      totalRefunded += parseFloat(ms.amount);
    }

    // Mark transaction cancelled.
    const updatedTx = await prisma.transaction.update({
      where: { id },
      data: {
        status: 'cancelled',
        updated_at: nowIso,
      },
    });

    // Audit log.
    req.log?.info?.(
      {
        adminId: req.user.id,
        action: 'cancel_transaction',
        txId: id,
        refundedCount: refundedMilestones.length,
        totalRefunded,
      },
      'admin_action'
    );
    await logAdminAction(
      req.user.id,
      'cancel_transaction',
      'transaction',
      id,
      { refundedCount: refundedMilestones.length, totalRefunded }
    );

    return res.json({
      success: true,
      data: {
        transaction: updatedTx,
        refundedMilestones,
        totalRefunded,
      },
    });
  } catch (err) {
    next(err);
  }
}

/* ---- Disputes ---- */

export async function getDisputes(req, res, next) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    const where = {};
    if (status) where.status = status;

    const [data, count] = await Promise.all([
      prisma.dispute.findMany({
        where,
        include: {
          raisedBy: { select: { full_name: true, email: true } },
          transaction: { select: { amount: true, status: true } },
          business: { select: { name: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: from,
        take: (to - from + 1),
      }),
      prisma.dispute.count({ where }),
    ]);

    return res.json({ success: true, data: data || [], total: count });
  } catch (err) { next(err); }
}

export async function resolveDispute(req, res, next) {
  try {
    const { id } = req.params;
    const { status, resolution } = req.body;
    if (!['resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Status must be resolved or dismissed' });
    }

    const dispute = await prisma.dispute.findUnique({ where: { id } });

    if (!dispute) return res.status(404).json({ success: false, error: 'Dispute not found' });

    await prisma.dispute.update({
      where: { id },
      data: {
        status,
        resolution: resolution || '',
        resolved_by: req.user.id,
        resolved_at: new Date(),
        updated_at: new Date(),
      },
    });

    // If resolved in favor of customer, refund their wallet
    if (status === 'resolved' && dispute.transaction_id) {
      const tx = await prisma.transaction.findUnique({
        where: { id: dispute.transaction_id },
        select: { customer_id: true, vendor_id: true, amount: true },
      });

      if (tx) {
        try {
          await atomicWalletUpdate({
            userId: tx.customer_id,
            delta: Number(tx.amount),
            kind: 'refund',
          });
        } catch {
          // best-effort refund; original swallowed errors
        }
        await prisma.transaction.update({
          where: { id: dispute.transaction_id },
          data: { status: 'cancelled', updated_at: new Date() },
        });
      }
    }

    await logAdminAction(req.user.id, 'resolve_dispute', 'dispute', id, { status, resolution });
    return res.json({ success: true, message: `Dispute ${status}` });
  } catch (err) { next(err); }
}

/* ---- Users ---- */

export async function getUsers(req, res, next) {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    const where = {};
    if (role) where.role = role;

    const [data, count] = await Promise.all([
      prisma.profile.findMany({
        where,
        select: { id: true, email: true, full_name: true, role: true, phone: true, created_at: true },
        orderBy: { created_at: 'desc' },
        skip: from,
        take: (to - from + 1),
      }),
      prisma.profile.count({ where }),
    ]);

    return res.json({ success: true, data: data || [], total: count });
  } catch (err) { next(err); }
}

export async function updateUserRole(req, res, next) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Review #4.5: only super_admins may change roles (including promoting
    // someone to admin or super_admin). Ordinary admins get 403.
    if (!req.user || req.user.role !== 'super_admin') {
      throw new AppError(
        403,
        'SUPER_ADMIN_REQUIRED',
        'Only super admins can change user roles.'
      );
    }

    if (!['user', 'vendor', 'admin', 'super_admin'].includes(role)) {
      throw new AppError(400, 'INVALID_ROLE', `Invalid role: ${role}`);
    }

    const data = await prisma.profile.update({
      where: { id },
      data: { role },
    });
    await logAdminAction(req.user.id, 'update_user_role', 'user', id, { role });
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    // With custom auth, deleting the profile cascades to the auth user and
    // related rows.
    await prisma.profile.delete({ where: { id } });
    await logAdminAction(req.user.id, 'delete_user', 'user', id);
    return res.json({ success: true, message: 'User deleted' });
  } catch (err) { next(err); }
}

/* ---- Platform Config ---- */

export async function getPlatformConfig(req, res, next) {
  try {
    const config = await getAllConfig();
    res.json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
}

export async function updatePlatformConfig(req, res, next) {
  try {
    const { key, value, platformFeePercent } = req.body || {};

    // Backward-compat: if the legacy caller sends `{ platformFeePercent }`,
    // map it to the new `platform_fee_rate` key. Both forms are supported.
    if (platformFeePercent !== undefined && key === undefined) {
      if (
        typeof platformFeePercent !== 'number' ||
        platformFeePercent < 0 ||
        platformFeePercent > 100
      ) {
        throw new AppError(
          400,
          'INVALID_VALUE',
          'Platform fee percent must be a number between 0 and 100.'
        );
      }
      await setConfig('platform_fee_rate', platformFeePercent, req.user?.id || null);
      await logAdminAction(req.user.id, 'update_platform_config', 'config', 'platform_fee_rate', { value: platformFeePercent });
      return res.json({ success: true, data: { platform_fee_rate: platformFeePercent } });
    }

    if (!key) {
      throw new AppError(400, 'MISSING_KEY', 'Config key is required.');
    }
    if (value === undefined) {
      throw new AppError(400, 'MISSING_VALUE', 'Config value is required.');
    }
    await setConfig(key, value, req.user?.id || null);
    await logAdminAction(req.user.id, 'update_platform_config', 'config', key, { value });
    res.json({ success: true, data: { key, value } });
  } catch (err) {
    next(err);
  }
}

/* ---- Location Management ---- */

export async function getAdminStates(req, res, next) {
  try {
    const data = await prisma.state.findMany({
      include: { country: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function createState(req, res, next) {
  try {
    const { name, countryId } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'State name is required' });
    if (name.length > 100) return res.status(400).json({ success: false, error: 'Name too long' });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const data = await prisma.state.create({
      data: { name, slug, country_id: countryId || undefined },
    });
    await logAdminAction(req.user.id, 'create_state', 'state', data.id, { name });
    return res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function updateState(req, res, next) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'State name is required' });
    if (name.length > 100) return res.status(400).json({ success: false, error: 'Name too long' });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const data = await prisma.state.update({ where: { id }, data: { name, slug } });
    await logAdminAction(req.user.id, 'update_state', 'state', id, { name });
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function deleteState(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.state.delete({ where: { id } });
    await logAdminAction(req.user.id, 'delete_state', 'state', id);
    return res.json({ success: true, message: 'State deleted' });
  } catch (err) { next(err); }
}

export async function getAdminLgas(req, res, next) {
  try {
    const data = await prisma.lga.findMany({
      include: { state: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function createLga(req, res, next) {
  try {
    const { name, stateId } = req.body;
    if (!name || !stateId) return res.status(400).json({ success: false, error: 'Name and state are required' });
    if (name.length > 100) return res.status(400).json({ success: false, error: 'Name too long' });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const data = await prisma.lga.create({ data: { name, slug, state_id: stateId } });
    await logAdminAction(req.user.id, 'create_lga', 'lga', data.id, { name, state_id: stateId });
    return res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function updateLga(req, res, next) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'LGA name is required' });
    if (name.length > 100) return res.status(400).json({ success: false, error: 'Name too long' });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const data = await prisma.lga.update({ where: { id }, data: { name, slug } });
    await logAdminAction(req.user.id, 'update_lga', 'lga', id, { name });
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function deleteLga(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.lga.delete({ where: { id } });
    await logAdminAction(req.user.id, 'delete_lga', 'lga', id);
    return res.json({ success: true, message: 'LGA deleted' });
  } catch (err) { next(err); }
}

export async function getAdminCities(req, res, next) {
  try {
    const data = await prisma.city.findMany({
      include: {
        state: { select: { name: true } },
        lga: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function createCity(req, res, next) {
  try {
    const { name, stateId, lgaId } = req.body;
    if (!name || !stateId) return res.status(400).json({ success: false, error: 'Name and state are required' });
    if (name.length > 100) return res.status(400).json({ success: false, error: 'Name too long' });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const data = await prisma.city.create({ data: { name, slug, state_id: stateId, lga_id: lgaId || null } });
    await logAdminAction(req.user.id, 'create_city', 'city', data.id, { name, state_id: stateId, lga_id: lgaId || null });
    return res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function updateCity(req, res, next) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'City name is required' });
    if (name.length > 100) return res.status(400).json({ success: false, error: 'Name too long' });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const data = await prisma.city.update({ where: { id }, data: { name, slug } });
    await logAdminAction(req.user.id, 'update_city', 'city', id, { name });
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function deleteCity(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.city.delete({ where: { id } });
    await logAdminAction(req.user.id, 'delete_city', 'city', id);
    return res.json({ success: true, message: 'City deleted' });
  } catch (err) { next(err); }
}

/* ---- Audit Log ---- */

export async function listAdminAuditLog(req, res, next) {
  try {
    const { listAdminActions } = await import('../utils/adminAudit.js');
    const { page, limit, adminId, action } = req.query;
    const result = await listAdminActions({
      page: Number(page) || 1,
      limit: Math.min(Number(limit) || 50, 200),
      adminId: adminId || null,
      action: action || null
    });
    return res.json({ success: true, ...result });
  } catch (err) { next(err); }
}
