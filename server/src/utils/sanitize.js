// User-generated content (UGC) sanitizer.
// Strips HTML and dangerous attributes from any string before it reaches the DB.
// Primary defense against stored XSS — database stays clean of executable markup.

import DOMPurify from 'isomorphic-dompurify';

const PLAIN_CONFIG = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,  // keep text content of stripped tags
};

const RICH_CONFIG = {
  ALLOWED_TAGS: ['a', 'b', 'i', 'em', 'strong', 'br', 'p', 'ul', 'ol', 'li', 'blockquote', 'code'],
  ALLOWED_ATTR: ['href', 'rel', 'target'],
  ALLOW_DATA_ATTR: false,
};

export function sanitizeText(input) {
  if (input === null || input === undefined) return input;
  if (typeof input !== 'string') return input;
  // Trim trailing whitespace; trim leading whitespace only on multi-line breaks.
  const cleaned = DOMPurify.sanitize(input, PLAIN_CONFIG);
  return cleaned.trim();
}

export function sanitizeRichText(input) {
  if (input === null || input === undefined) return input;
  if (typeof input !== 'string') return input;
  return DOMPurify.sanitize(input, RICH_CONFIG).trim();
}

// Recursively sanitize all string values in an object (one level deep by default;
// pass `deep: true` for nested arrays/objects).
export function sanitizeObject(obj, fields, { mode = 'plain', deep = false } = {}) {
  if (!obj || typeof obj !== 'object') return obj;
  const fn = mode === 'rich' ? sanitizeRichText : sanitizeText;
  const result = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const key of Object.keys(result)) {
    if (fields.includes(key) && typeof result[key] === 'string') {
      result[key] = fn(result[key]);
    } else if (deep && result[key] && typeof result[key] === 'object') {
      result[key] = sanitizeObject(result[key], fields, { mode, deep: true });
    }
  }

  return result;
}

export default { sanitizeText, sanitizeRichText, sanitizeObject };
