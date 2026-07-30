import { prisma } from '../config/prisma.js';
import crypto from 'crypto';
import { AppError } from '../middleware/errorHandler.js';
import { sanitizeText } from '../utils/sanitize.js';

export async function getWorkUpdates(req, res, next) {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const project = await prisma.workProject.findUnique({
      where: { id: projectId },
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

    const data = await prisma.workUpdate.findMany({
      where: { project_id: projectId },
      include: { creator: { select: { full_name: true, avatar_url: true } } },
      orderBy: { created_at: 'desc' },
    });

    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createWorkUpdate(req, res, next) {
  try {
    const { projectId } = req.params;
    const { message, images } = req.body;
    if (!message) return next(new AppError(400, 'VALIDATION', 'Message is required'));
    if (message.length > 5000) return next(new AppError(400, 'VALIDATION', 'Message too long'));
    const userId = req.user.id;

    const project = await prisma.workProject.findUnique({
      where: { id: projectId },
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

    const data = await prisma.workUpdate.create({
      data: {
        id: crypto.randomUUID(),
        project_id: projectId,
        message: sanitizeText(message),
        images,
        created_by: userId,
      },
      include: { creator: { select: { full_name: true, avatar_url: true } } },
    });

    return res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
