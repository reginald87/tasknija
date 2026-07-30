import { Router } from 'express';
import multer from 'multer';

import { authenticate } from '../middleware/auth.js';
import {
  uploadFile,
  getFile,
  deleteFile
} from '../controllers/uploadController.js';
import { AppError } from '../middleware/errorHandler.js';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(null, true);
    }
    // Surface a structured error; the controller / errorHandler renders it.
    return cb(new AppError(400, 'INVALID_MIME_TYPE', `Unsupported file type: ${file.mimetype}`));
  }
});

const router = Router();

router.post('/', authenticate, upload.array('files', 10), uploadFile);
router.get('/:fileId', getFile);
router.delete('/:fileId', authenticate, deleteFile);

export default router;
