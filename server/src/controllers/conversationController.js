import { prisma } from '../config/prisma.js';
import crypto from 'crypto';
import { AppError } from '../middleware/errorHandler.js';
import { sanitizeText } from '../utils/sanitize.js';
import { paginate } from '../utils/shared.js';

export async function getConversations(req, res, next) {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { page, limit } = req.query || {};
    const { page: p, limit: l, offset } = paginate(page, limit, 50);

    const where = {};
    if (role === 'user') {
      where.customer_id = userId;
    } else if (role === 'vendor') {
      where.vendor_id = userId;
    } else {
      where.OR = [{ customer_id: userId }, { vendor_id: userId }];
    }

    const [data, count] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          customer: { select: { full_name: true, email: true, avatar_url: true } },
          vendor: { select: { full_name: true, email: true, avatar_url: true } },
          business: { select: { name: true, slug: true, images: true } },
          _count: { select: { messages: true } },
        },
        orderBy: { updated_at: 'desc' },
        skip: offset,
        take: l,
      }),
      prisma.conversation.count({ where }),
    ]);

    const serialized = data.map((c) => ({
      ...c,
      messages: { count: c._count.messages },
    }));

    return res.json({ success: true, data: serialized, total: count || 0, page: p, limit: l });
  } catch (err) {
    next(err);
  }
}

export async function getConversationById(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        customer: { select: { full_name: true, email: true, avatar_url: true } },
        vendor: { select: { full_name: true, email: true, avatar_url: true } },
        business: { select: { name: true, slug: true, images: true } },
      },
    });

    if (!conversation) return next(new AppError(404, 'NOT_FOUND', 'Conversation not found'));

    if (conversation.customer_id !== userId && conversation.vendor_id !== userId) {
      return next(new AppError(403, 'FORBIDDEN', 'Not authorized'));
    }

    return res.json({ success: true, data: conversation });
  } catch (err) {
    next(err);
  }
}

export async function createConversation(req, res, next) {
  try {
    const { vendorId, businessId, message } = req.body;
    const customerId = req.user.id;

    const existing = await prisma.conversation.findFirst({
      where: { customer_id: customerId, vendor_id: vendorId, business_id: businessId },
      select: { id: true },
    });

    if (existing) {
      const full = await prisma.conversation.findUnique({
        where: { id: existing.id },
        include: {
          customer: { select: { full_name: true, email: true, avatar_url: true } },
          vendor: { select: { full_name: true, email: true, avatar_url: true } },
          business: { select: { name: true, slug: true, images: true } },
        },
      });
      const conversationId = full?.id || existing.id;
      if (message && message.trim()) {
        await prisma.message.create({
          data: {
            id: crypto.randomUUID(),
            conversation_id: conversationId,
            sender_id: customerId,
            content: sanitizeText(message),
            message_type: 'text',
          },
        });
      }
      return res.json({ success: true, data: full || existing });
    }

    const data = await prisma.conversation.create({
      data: {
        id: crypto.randomUUID(),
        customer_id: customerId,
        vendor_id: vendorId,
        business_id: businessId,
        ...(message && message.trim()
          ? { messages: { create: { id: crypto.randomUUID(), sender_id: customerId, content: sanitizeText(message), message_type: 'text' } } }
          : {}),
      },
      include: {
        customer: { select: { full_name: true, email: true, avatar_url: true } },
        vendor: { select: { full_name: true, email: true, avatar_url: true } },
        business: { select: { name: true, slug: true, images: true } },
      },
    });

    return res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
