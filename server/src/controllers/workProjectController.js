import { prisma } from '../config/prisma.js';
import crypto from 'crypto';
import { AppError } from '../middleware/errorHandler.js';
import { sanitizeText } from '../utils/sanitize.js';

export async function getWorkProjects(req, res, next) {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { customer_id: true, vendor_id: true },
    });

    if (!conversation || (conversation.customer_id !== userId && conversation.vendor_id !== userId)) {
      return next(new AppError(403, 'FORBIDDEN', 'Not authorized'));
    }

    const data = await prisma.workProject.findMany({
      where: { conversation_id: conversationId },
      include: { _count: { select: { updates: true } } },
      orderBy: { created_at: 'desc' },
    });

    const serialized = data.map((p) => ({ ...p, work_updates: { count: p._count.updates } }));

    return res.json({ success: true, data: serialized });
  } catch (err) {
    next(err);
  }
}

export async function createWorkProject(req, res, next) {
  try {
    const { conversationId } = req.params;
    const { title, description } = req.body;
    if (!title) return next(new AppError(400, 'VALIDATION', 'Title is required'));
    if (title.length > 200) return next(new AppError(400, 'VALIDATION', 'Title too long'));
    if (description && description.length > 5000) return next(new AppError(400, 'VALIDATION', 'Description too long'));
    const userId = req.user.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { customer_id: true, vendor_id: true },
    });

    if (!conversation || (conversation.customer_id !== userId && conversation.vendor_id !== userId)) {
      return next(new AppError(403, 'FORBIDDEN', 'Not authorized'));
    }

    const data = await prisma.workProject.create({
      data: {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        title: sanitizeText(title),
        description: sanitizeText(description),
      },
    });

    return res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateWorkProject(req, res, next) {
  try {
    const { id } = req.params;
    const { status, progress } = req.body;
    const userId = req.user.id;

    const project = await prisma.workProject.findUnique({
      where: { id },
      select: { conversation_id: true },
    });

    if (!project) return next(new AppError(404, 'NOT_FOUND', 'Project not found'));

    const conversation = await prisma.conversation.findUnique({
      where: { id: project.conversation_id },
      select: { customer_id: true, vendor_id: true },
    });

    if (!conversation || (conversation.customer_id !== userId && conversation.vendor_id !== userId)) {
      return next(new AppError(403, 'FORBIDDEN', 'Not authorized'));
    }

    const data = await prisma.workProject.update({
      where: { id },
      data: { status, progress },
    });

    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
