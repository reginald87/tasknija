import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { sanitizeText } from '../utils/sanitize.js';
import { paginate } from '../utils/shared.js';

export async function getByBusiness(req, res, next) {
  try {
    const { businessId } = req.params;
    const { page, limit } = req.query || {};
    const { page: p, limit: l, offset } = paginate(page, limit);

    const where = { business_id: businessId };

    const [data, count] = await Promise.all([
      prisma.review.findMany({
        where,
        include: { user: { select: { full_name: true, avatar_url: true } } },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: l,
      }),
      prisma.review.count({ where }),
    ]);

    return res.json({ success: true, data, total: count || 0, page: p, limit: l });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { businessId, rating, comment } = req.body;

    if (!businessId || rating === null || rating === undefined) {
      return res.status(400).json({ success: false, error: 'Business ID and rating are required' });
    }
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be a number between 1 and 5' });
    }
    if (comment && comment.length > 2000) return res.status(400).json({ success: false, error: 'Comment too long' });

    const existing = await prisma.review.findFirst({
      where: { business_id: businessId, user_id: req.user.id },
      select: { id: true },
    });

    if (existing) {
      return res.status(400).json({ success: false, error: 'You have already reviewed this business' });
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { owner_id: true },
    });
    if (!business) {
      throw new AppError(404, 'BUSINESS_NOT_FOUND', 'Business not found.');
    }

    const completed = await prisma.transaction.findFirst({
      where: {
        customer_id: req.user.id,
        business_id: businessId,
        vendor_id: business.owner_id,
        status: 'completed',
      },
      select: { id: true },
    });
    if (!completed) {
      throw new AppError(
        403,
        'NO_TRANSACTION',
        'You can only review vendors you have completed a transaction with.'
      );
    }

    const data = await prisma.review.create({
      data: {
        business_id: businessId,
        user_id: req.user.id,
        rating,
        comment: sanitizeText(comment),
      },
    });

    return res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
