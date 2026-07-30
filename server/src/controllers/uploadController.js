import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { fileTypeFromBuffer } from 'file-type';

import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../middleware/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '..', '..', 'var', 'uploads');

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf'
};

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Insert a row into FileUpload. The table always exists now (Prisma+SQLite),
 * so any insert error is rethrown.
 */
async function persistFileMetadata(metadata) {
  const created = await prisma.fileUpload.create({
    data: {
      user_id: metadata.user_id,
      original_name: metadata.original_name,
      stored_name: metadata.stored_name,
      mime: metadata.mime,
      size: metadata.size,
      uploaded_at: metadata.uploaded_at,
    },
  });
  return { row: created, persisted: true };
}

async function validateAndSaveFile(file, userId) {
  const { buffer, mimetype, size, originalname } = file;

  if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
    throw new AppError(400, 'INVALID_MIME_TYPE', `Unsupported file type: ${mimetype}`);
  }

  if (size > MAX_FILE_SIZE) {
    throw new AppError(413, 'FILE_TOO_LARGE', `File exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)} MB`);
  }

  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !ALLOWED_MIME_TYPES.includes(detected.mime)) {
    throw new AppError(400, 'MIME_MISMATCH', `File contents do not match declared type '${mimetype}'. Detected: ${detected?.mime || 'unknown'}`);
  }

  if (detected.mime !== mimetype) {
    throw new AppError(400, 'MIME_MISMATCH', `Declared type '${mimetype}' does not match actual file format '${detected.mime}'.`);
  }

  const uuid = crypto.randomUUID();
  const ext = MIME_TO_EXT[mimetype] || '';
  const storedName = `${uuid}${ext}`;
  const absolutePath = path.join(UPLOAD_DIR, storedName);

  fs.writeFileSync(absolutePath, buffer);

  const metadata = { user_id: userId, original_name: originalname, stored_name: storedName, mime: mimetype, size, uploaded_at: new Date().toISOString() };
  const { row, persisted } = await persistFileMetadata(metadata);

  return { file_id: row.id, name: row.original_name, size: row.size, mime: row.mime, url: `/api/upload/${row.id}`, stored: persisted };
}

/**
 * POST /api/upload
 * Multipart upload. Accepts a single file (`file`) or multiple (`files`).
 */
export async function uploadFile(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) {
      throw new AppError(400, 'NO_FILE', 'No file uploaded');
    }

    const results = [];
    for (const file of req.files) {
      const result = await validateAndSaveFile(file, req.user.id);
      results.push(result);
    }

    return res.status(201).json({
      success: true,
      data: results
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/upload/:fileId
 * Public file serving (business photos need to be viewable by customers).
 */
export async function getFile(req, res, next) {
  try {
    const { fileId } = req.params;
    if (!fileId) {
      throw new AppError(400, 'MISSING_FILE_ID', 'fileId required');
    }

    const fileRow = await prisma.fileUpload.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        user_id: true,
        original_name: true,
        stored_name: true,
        mime: true,
        size: true,
        uploaded_at: true,
      },
    });

    if (!fileRow) {
      throw new AppError(404, 'NOT_FOUND', 'File not found');
    }

    const absolutePath = path.join(UPLOAD_DIR, fileRow.stored_name);
    if (!fs.existsSync(absolutePath)) {
      throw new AppError(404, 'NOT_FOUND', 'File not found');
    }

    res.setHeader('Content-Type', fileRow.mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileRow.original_name)}"`);

    return res.sendFile(absolutePath);
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /api/upload/:fileId
 * Owner or admin only.
 */
export async function deleteFile(req, res, next) {
  try {
    const { fileId } = req.params;
    if (!fileId) {
      throw new AppError(400, 'MISSING_FILE_ID', 'fileId required');
    }

    const fileRow = await prisma.fileUpload.findUnique({
      where: { id: fileId },
      select: { id: true, user_id: true, stored_name: true },
    });

    if (!fileRow) {
      throw new AppError(404, 'NOT_FOUND', 'File not found');
    }

    const isOwner = fileRow.user_id === req.user.id;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';

    if (!isOwner && !isAdmin) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to delete this file');
    }

    // Delete DB row first; if file unlink fails, log but don't roll back.
    await prisma.fileUpload.delete({ where: { id: fileId } });

    // Best-effort filesystem cleanup.
    try {
      const absolutePath = path.join(UPLOAD_DIR, fileRow.stored_name);
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    } catch (unlinkErr) {
      logger.warn({ err: unlinkErr }, 'failed to unlink file');
    }

    return res.json({ success: true, message: 'File deleted.' });
  } catch (err) {
    return next(err);
  }
}
