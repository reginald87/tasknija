/**
 * Zod validation middleware factory.
 *
 *   validate(schema)                                      -> validates req.body
 *   validate(schema, 'query')                             -> validates req.query
 *   validate(schema, 'params')                            -> validates req.params
 *   validate(schema, 'body', { sanitize: { fields } })    -> sanitizes UGC after parse
 *
 * On success: replaces req[source] with the parsed (and coerced) value.
 * On error  : throws AppError(400, 'VALIDATION_ERROR', message, issues).
 *
 * Sanitization runs AFTER zod parse, so zod type errors win — an invalid type
 * returns 400, never a sanitized-but-still-invalid value.
 */

import { AppError } from './errorHandler.js';
import { sanitizeObject } from '../utils/sanitize.js';

const SOURCES = new Set(['body', 'query', 'params']);

export function validate(schema, source = 'body', options = {}) {
  if (!schema || typeof schema.safeParse !== 'function') {
    throw new TypeError('validate(schema): schema must be a zod schema');
  }
  if (!SOURCES.has(source)) {
    throw new TypeError(`validate(): source must be one of ${[...SOURCES].join(', ')}`);
  }

  const { sanitize } = options;

  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
        code: i.code,
      }));
      return next(
        new AppError(400, 'VALIDATION_ERROR', 'Invalid request payload', issues)
      );
    }
    let data = result.data;
    if (sanitize?.fields?.length && data && typeof data === 'object') {
      data = sanitizeObject(data, sanitize.fields, { mode: sanitize.mode });
    }
    req[source] = data;
    return next();
  };
}

export default validate;
