import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export async function getAvailability(req, res, next) {
  try {
    const { id: businessId } = req.params;
    const [weekly, blocked] = await Promise.all([
      prisma.vendorAvailability.findMany({
        where: { business_id: businessId },
        orderBy: { day_of_week: 'asc' },
      }),
      prisma.vendorBlockedDate.findMany({
        where: {
          business_id: businessId,
          blocked_date: { gte: new Date().toISOString().slice(0, 10) },
        },
        orderBy: { blocked_date: 'asc' },
      }),
    ]);
    return res.json({ success: true, data: { weekly, blocked } });
  } catch (err) { next(err); }
}

async function assertOwner(businessId, userId) {
  const biz = await prisma.business.findUnique({
    where: { id: businessId },
    select: { owner_id: true },
  });
  if (!biz) throw new AppError(404, 'NOT_FOUND', 'Business not found.');
  if (biz.owner_id !== userId) throw new AppError(403, 'FORBIDDEN', 'Only the owner can edit availability.');
}

export async function setWeeklyAvailability(req, res, next) {
  try {
    const { id: businessId } = req.params;
    await assertOwner(businessId, req.user.id);
    const { schedule } = req.body;
    if (!Array.isArray(schedule)) throw new AppError(400, 'INVALID_SCHEDULE', 'schedule must be an array.');

    await prisma.vendorAvailability.deleteMany({ where: { business_id: businessId } });
    const rows = schedule.map(s => ({
      business_id: businessId,
      day_of_week: s.day_of_week,
      start_time: s.start_time,
      end_time: s.end_time,
      is_available: s.is_available !== false,
    }));
    const data = await prisma.vendorAvailability.createMany({ data: rows });
    return res.json({ success: true, data: { count: data.count } });
  } catch (err) { next(err); }
}

export async function addBlockedDate(req, res, next) {
  try {
    const { id: businessId } = req.params;
    await assertOwner(businessId, req.user.id);
    const { blocked_date, reason } = req.body;
    if (!blocked_date) throw new AppError(400, 'MISSING_DATE', 'blocked_date required.');
    const data = await prisma.vendorBlockedDate.create({
      data: { business_id: businessId, blocked_date, reason },
    });
    return res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function removeBlockedDate(req, res, next) {
  try {
    const { id: businessId, dateId } = req.params;
    await assertOwner(businessId, req.user.id);
    await prisma.vendorBlockedDate.deleteMany({
      where: { id: dateId, business_id: businessId },
    });
    return res.json({ success: true, message: 'Blocked date removed.' });
  } catch (err) { next(err); }
}
