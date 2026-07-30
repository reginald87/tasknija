import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { paginate } from '../utils/shared.js';
import { serializeBusiness } from '../utils/serializers.js';

export async function listMyFavorites(req, res, next) {
  try {
    const userId = req.user.id;
    const { page, limit } = req.query || {};
    const { page: p, limit: l, offset } = paginate(page, limit);
    const [data, count] = await Promise.all([
      prisma.favorite.findMany({
        where: { user_id: userId },
        include: { business: true },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: l,
      }),
      prisma.favorite.count({ where: { user_id: userId } }),
    ]);
    const serialized = data.map((f) => ({ ...f, business: serializeBusiness(f.business) }));
    return res.json({ success: true, data: serialized, total: count || 0, page: p, limit: l });
  } catch (err) { next(err); }
}

export async function addFavorite(req, res, next) {
  try {
    const userId = req.user.id;
    const { businessId } = req.params;
    try {
      const data = await prisma.favorite.create({
        data: { user_id: userId, business_id: businessId },
      });
      return res.status(201).json({ success: true, data });
    } catch (err) {
      if (err?.code === 'P2002') throw new AppError(409, 'ALREADY_FAVORITED', 'Business already in favorites.');
      throw err;
    }
  } catch (err) { next(err); }
}

export async function removeFavorite(req, res, next) {
  try {
    const userId = req.user.id;
    const { businessId } = req.params;
    await prisma.favorite.deleteMany({
      where: { user_id: userId, business_id: businessId },
    });
    return res.json({ success: true, message: 'Removed from favorites.' });
  } catch (err) { next(err); }
}

export async function checkFavorite(req, res, next) {
  try {
    const userId = req.user.id;
    const { businessId } = req.params;
    const data = await prisma.favorite.findFirst({
      where: { user_id: userId, business_id: businessId },
      select: { id: true },
    });
    return res.json({ success: true, data: { isFavorite: !!data } });
  } catch (err) { next(err); }
}
