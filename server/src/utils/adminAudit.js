import { prisma } from '../config/prisma.js';
import { logger } from '../middleware/logger.js';

export async function logAdminAction(adminId, action, targetType, targetId, metadata = {}) {
  try {
    await prisma.adminAction.create({
      data: {
        admin_id: adminId,
        action,
        target_type: targetType,
        target_id: targetId,
        metadata: JSON.stringify(metadata),
      },
    });
  } catch (err) {
    logger.error({ err }, 'admin audit log failed');
  }
}

export async function listAdminActions({ page = 1, limit = 50, adminId = null, action = null } = {}) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (safePage - 1) * safeLimit;

  const where = {};
  if (adminId) where.admin_id = adminId;
  if (action) where.action = action;

  const [data, total] = await Promise.all([
    prisma.adminAction.findMany({
      where,
      include: { admin: { select: { full_name: true, email: true } } },
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: safeLimit,
    }),
    prisma.adminAction.count({ where }),
  ]);

  return { data, total, page: safePage, limit: safeLimit };
}
