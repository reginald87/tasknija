import { prisma } from '../config/prisma.js';

export async function listMyNotifications(req, res, next) {
  try {
    const userId = req.user.id;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const [data, count] = await Promise.all([
      prisma.notification.findMany({
        where: { user_id: userId },
        orderBy: { sent_at: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.notification.count({ where: { user_id: userId } }),
    ]);

    return res.json({
      success: true,
      data,
      pagination: { page, limit, total: count || 0 },
    });
  } catch (err) { next(err); }
}

export async function markRead(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const data = await prisma.notification.updateMany({
      where: { id, user_id: userId },
      data: { read_at: new Date().toISOString() },
    });

    if (data.count === 0) {
      return next(new (await import('../middleware/errorHandler.js')).AppError(404, 'NOT_FOUND', 'Notification not found'));
    }

    const updated = await prisma.notification.findUnique({ where: { id } });
    return res.json({ success: true, data: updated });
  } catch (err) { next(err); }
}

export async function getUnreadCount(req, res, next) {
  try {
    const userId = req.user.id;

    const count = await prisma.notification.count({
      where: { user_id: userId, read_at: null },
    });

    return res.json({ success: true, data: { count: count || 0 } });
  } catch (err) { next(err); }
}
