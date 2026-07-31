import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { logAdminAction } from '../utils/adminAudit.js';
import { parseJson } from '../utils/serializers.js';
import { sendNotification } from '../utils/notifications.js';
import { sendVerificationApproved, sendVerificationRejected } from '../utils/email.js';

function serializeVerification(row) {
  if (!row) return row;
  return { ...row, documents: parseJson(row.documents, []) };
}

/** Vendors: view their latest verification submission. */
export async function getMyVerification(req, res, next) {
  try {
    const row = await prisma.vendorVerification.findFirst({
      where: { user_id: req.user.id },
      orderBy: { created_at: 'desc' },
    });
    return res.json({ success: true, data: serializeVerification(row) });
  } catch (err) { next(err); }
}

/** Vendors: submit or resubmit their KYC details + documents for review. */
export async function submitVerification(req, res, next) {
  try {
    const { business_name, id_type, id_number, notes, documents } = req.body;

    const existing = await prisma.vendorVerification.findFirst({
      where: { user_id: req.user.id },
      orderBy: { created_at: 'desc' },
    });
    if (existing?.status === 'approved') {
      throw new AppError(400, 'ALREADY_VERIFIED', 'Your business is already verified.');
    }

    const payload = {
      business_name: business_name ?? existing?.business_name ?? null,
      id_type,
      id_number,
      documents: JSON.stringify(documents),
      notes: notes || null,
      rejection_reason: null,
      status: 'pending',
      reviewed_by: null,
      reviewed_at: null,
    };

    let row;
    if (existing) {
      row = await prisma.vendorVerification.update({ where: { id: existing.id }, data: { ...payload, updated_at: new Date() } });
    } else {
      row = await prisma.vendorVerification.create({ data: { user_id: req.user.id, ...payload } });
    }

    await sendNotification({
      userId: req.user.id,
      type: 'verification_submitted',
      title: 'Verification submitted',
      body: 'Your verification details have been submitted. Our team reviews applications within 1–2 business days.',
      data: { verificationId: row.id },
    }).catch((err) => req?.log?.warn?.({ err }, 'verification notification failed'));

    return res.json({ success: true, data: serializeVerification(row) });
  } catch (err) { next(err); }
}

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
    return res.json({ success: true, data: data.map(serializeVerification), total: count, page: Number(page), limit: Number(limit) });
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
        rejection_reason: null,
      },
    });

    if (data?.user_id) {
      // Verified businesses carry the verified badge on all their listings.
      await prisma.business.updateMany({
        where: { owner_id: data.user_id },
        data: {
          verification_status: 'verified',
          verified_at: new Date(),
          verified_by: req.user.id,
        },
      });
      const user = await prisma.profile.findUnique({
        where: { id: data.user_id },
        select: { email: true, full_name: true },
      });
      if (user) {
        await sendNotification({
          userId: data.user_id,
          type: 'verification_approved',
          title: 'Business verified 🎉',
          body: 'Your business has been verified. Your listings now carry the verified badge.',
          data: { verificationId: data.id },
        }).catch((err) => req?.log?.warn?.({ err }, 'approve notification failed'));
        await sendVerificationApproved({ email: user.email, name: user.full_name })
          .catch((err) => req?.log?.warn?.({ err }, 'approve email failed'));
      }
    }

    await logAdminAction(req.user.id, 'approve_vendor', 'vendor_verification', id);
    return res.json({ success: true, data: serializeVerification(data) });
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

    if (data?.user_id) {
      const user = await prisma.profile.findUnique({
        where: { id: data.user_id },
        select: { email: true, full_name: true },
      });
      if (user) {
        await sendNotification({
          userId: data.user_id,
          type: 'verification_rejected',
          title: 'Verification needs attention',
          body: reason,
          data: { verificationId: data.id },
        }).catch((err) => req?.log?.warn?.({ err }, 'reject notification failed'));
        await sendVerificationRejected({ email: user.email, name: user.full_name, reason })
          .catch((err) => req?.log?.warn?.({ err }, 'reject email failed'));
      }
    }

    await logAdminAction(req.user.id, 'reject_vendor', 'vendor_verification', id, { reason });
    return res.json({ success: true, data: serializeVerification(data) });
  } catch (err) { next(err); }
}
