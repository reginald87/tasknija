/**
 * Standardized error handler + AppError class.
 *
 * Response shape:
 *   { success: false, error: { code: string, message: string, details?: any } }
 *
 * Logging: uses req.log (set by pino-http).
 */

import { ZodError } from 'zod';
import jwt from 'jsonwebtoken';

export class AppError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

function pgCode(err) {
  return err?.code || err?.cause?.code || null;
}

export function errorHandler(err, req, res, _next) {
  const log = req?.log || console;
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  let details;

  if (err instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Invalid request payload';
    details = err.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
      code: i.code,
    }));
  } else if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.TokenExpiredError) {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = err instanceof jwt.TokenExpiredError ? 'Token expired' : 'Invalid token';
  } else if (err instanceof AppError) {
    statusCode = err.statusCode || 500;
    code = err.code || 'APP_ERROR';
    message = err.message;
    if (err.details !== undefined) details = err.details;
  } else if (err && typeof err === 'object') {
    const pg = pgCode(err);
    if (pg === '23505') {
      statusCode = 409;
      code = 'CONFLICT';
      message = 'A record with that value already exists';
    } else if (pg === '42501') {
      statusCode = 403;
      code = 'FORBIDDEN';
      message = 'Insufficient database permissions';
    } else if (err.statusCode && Number.isInteger(err.statusCode)) {
      statusCode = err.statusCode;
      code = err.code || code;
      message = err.message || message;
      if (err.details !== undefined) details = err.details;
    }
  }

  // Log server-side errors with stack; client errors (4xx) at warn level only.
  const logPayload = { err, statusCode, code, path: req?.originalUrl, method: req?.method };
  if (statusCode >= 500) {
    log.error?.(logPayload);
  } else {
    log.warn?.(logPayload);
  }

  const body = { success: false, error: { code, message } };
  if (details !== undefined) body.error.details = details;
  if (process.env.NODE_ENV !== 'production' && statusCode >= 500 && err?.stack) {
    body.error.stack = err.stack;
  }

  res.status(statusCode).json(body);
}

/** Strip internal DB details from error messages sent to clients */
export function sanitizeError(error) {
  if (!error) return 'Unknown error';
  if (error.code === 'PGRST116') return 'Not found';
  if (error.code === '23505') return 'A record with that value already exists';
  if (error.code === '23503') return 'This record is referenced by other data and cannot be deleted';
  if (error.code && error.details) return 'Database operation failed';
  return error.message || 'Operation failed';
}
