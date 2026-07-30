import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { logAdminAction } from '../utils/adminAudit.js';
import { sanitizeText } from '../utils/sanitize.js';

export async function createReport(req, res, next) {
  try {
    const { target_type, target_id, reason } = req.body;
    if (!['business', 'user', 'review'].includes(target_type)) {
      throw new AppError(400, 'INVALID_TARGET_TYPE', 'target_type must be business|user|review.');
    }
    if (!target_id || !reason) {
      throw new AppError(400, 'MISSING_FIELDS', 'target_id and reason required.');
    }
    const data = await prisma.report.create({
      data: {
        reporter_id: req.user.id,
        target_type,
        target_id,
        reason: sanitizeText(reason),
      },
    });
    return res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function listReports(req, res, next) {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const where = {};
    if (status) where.status = status;
    const offset = (page - 1) * Number(limit);

    const [data, count] = await Promise.all([
      prisma.report.findMany({
        where,
        include: { reporter: { select: { full_name: true, email: true } } },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: Number(limit),
      }),
      prisma.report.count({ where }),
    ]);
    return res.json({ success: true, data, total: count, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
}

export async function resolveReport(req, res, next) {
  try {
    const { id } = req.params;
    const { action, admin_note } = req.body;
    if (!['resolved', 'dismissed'].includes(action)) {
      throw new AppError(400, 'INVALID_ACTION', 'action must be resolved|dismissed.');
    }
    const data = await prisma.report.update({
      where: { id },
      data: {
        status: action,
        admin_note,
        resolved_by: req.user.id,
        resolved_at: new Date(),
      },
    });
    await logAdminAction(req.user.id, 'resolve_report', 'report', id, { action, admin_note });
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}
