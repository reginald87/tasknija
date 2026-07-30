import { prisma } from '../config/prisma.js';
import crypto from 'crypto';
import { AppError } from '../middleware/errorHandler.js';
import { sanitizeText } from '../utils/sanitize.js';
import { serializeMessages } from '../utils/serializers.js';

export async function getMessages(req, res, next) {
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

    const data = await prisma.message.findMany({
      where: { conversation_id: conversationId },
      include: { sender: { select: { full_name: true, avatar_url: true } } },
      orderBy: { created_at: 'asc' },
    });

    await prisma.message.updateMany({
      where: {
        conversation_id: conversationId,
        sender_id: { not: userId },
        read_at: null,
      },
      data: { read_at: new Date() },
    });

    return res.json({ success: true, data: serializeMessages(data) });
  } catch (err) {
    next(err);
  }
}

/**
 * Validate an attachments payload (chunk 8b).
 *
 * Each attachment must have at minimum `file_id` and `name`. Optional
 * fields: `size`, `mime`, `url`.
 */
function validateAttachments(rawAttachments) {
  if (rawAttachments === null || rawAttachments === undefined) return [];
  if (!Array.isArray(rawAttachments)) {
    throw new AppError(400, 'INVALID_ATTACHMENTS', 'attachments must be an array.');
  }
  if (rawAttachments.length > 10) {
    throw new AppError(400, 'TOO_MANY_ATTACHMENTS', 'Maximum 10 attachments per message.');
  }
  const out = [];
  for (const att of rawAttachments) {
    if (!att || typeof att !== 'object') {
      throw new AppError(400, 'INVALID_ATTACHMENT', 'Each attachment must be an object.');
    }
    if (!att.file_id || !att.name) {
      throw new AppError(400, 'INVALID_ATTACHMENT', 'Each attachment needs file_id and name.');
    }
    out.push({
      file_id: String(att.file_id),
      name: String(att.name),
      size: att.size !== null && att.size !== undefined ? Number(att.size) : null,
      mime: att.mime ? String(att.mime) : null,
      url: att.url ? String(att.url) : null,
    });
  }
  return out;
}

export async function sendMessage(req, res, next) {
  try {
    const { conversationId } = req.params;
    const { content, messageType, attachmentUrl } = req.body;
    if (!content) return next(new AppError(400, 'VALIDATION', 'Message content is required'));
    if (content.length > 5000) return next(new AppError(400, 'VALIDATION', 'Message too long'));
    const senderId = req.user.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { customer_id: true, vendor_id: true },
    });

    if (!conversation || (conversation.customer_id !== senderId && conversation.vendor_id !== senderId)) {
      return next(new AppError(403, 'FORBIDDEN', 'Not authorized'));
    }

    const attachments = validateAttachments(req.body.attachments);

    const message_type = messageType || (attachments.length ? 'file' : 'text');

    const data = await prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        sender_id: senderId,
        content: sanitizeText(content),
        message_type,
        attachment_url: attachmentUrl,
        attachments: attachments.length ? JSON.stringify(attachments) : null,
      },
      include: { sender: { select: { full_name: true, avatar_url: true } } },
    });

    return res.status(201).json({ success: true, data: serializeMessages([data])[0] });
  } catch (err) {
    next(err);
  }
}
