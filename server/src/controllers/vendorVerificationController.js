import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { logAdminAction } from '../utils/adminAudit.js';

export async function listPendingVerifications(req, res, next) {
  try {
    const { page = 1, limit = 50, status = 'pending' } = req.query;
    const where = {};
    if (status !== 'all') where.status = status;
    const offset = (page - 1) * Number(limit);

    const [data, count] = await Promise.all([
      prisma.vendorVerification.findMany({
        where,
        include: { user: { select: { full_name: true, email: true, phone: true, avatar_url: true } } },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: Number(limit),
      }),
      prisma.vendorVerification.count({ where }),
    ]);
    return res.json({ success: true, data, total: count, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
}

export async function approveVerification(req, res, next) {
  try {
    const { id } = req.params;
    const data = await prisma.vendorVerification.update({
      where: { id },
      data: {
        status: 'approved',
        reviewed_by: req.user.id,
        reviewed_at: new Date(),
      },
    });

    if (data?.user_id) {
      await prisma.profile.update({
        where: { id: data.user_id },
        data: { is_verified: true },
      });
    }

    await logAdminAction(req.user.id, 'approve_vendor', 'vendor_verification', id);
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function rejectVerification(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason) throw new AppError(400, 'MISSING_REASON', 'reason required.');
    const data = await prisma.vendorVerification.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewed_by: req.user.id,
        reviewed_at: new Date(),
        rejection_reason: reason,
      },
    });
    await logAdminAction(req.user.id, 'reject_vendor', 'vendor_verification', id, { reason });
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}
