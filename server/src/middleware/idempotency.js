import { prisma } from '../config/prisma.js';
import { AppError } from './errorHandler.js';

const METHODS = new Set(['POST', 'PUT', 'PATCH']);

function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function safeJson(res, status, body) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function j(v) { return JSON.stringify(v); }

export function idempotency(options = {}) {
  const headerName = options.header || 'idempotency-key';
  const maxKeyLength = options.maxKeyLength || 255;

  return async (req, res, next) => {
    if (!METHODS.has(req.method)) return next();

    const key = req.headers[headerName];
    if (!key || typeof key !== 'string') return next();

    if (key.length === 0 || key.length > maxKeyLength) {
      return next(
        new AppError(400, 'INVALID_IDEMPOTENCY_KEY', 'Idempotency-Key must be 1..255 characters')
      );
    }

    if (!req.user || !req.user.id) return next();

    const userId = req.user.id;
    const endpoint = `${req.method} ${req.baseUrl || ''}${req.path}`;

    try {
      const existing = await prisma.idempotencyKey.findUnique({
        where: { key_user_id: { key, user_id: userId } },
      });

      if (existing && existing.response) {
        const cached = JSON.parse(existing.response);
        const status = Number.isInteger(cached.status) ? cached.status : 200;
        res.setHeader('Idempotent-Replay', 'true');
        return safeJson(res, status, cached.body);
      }
    } catch (lookupErr) {
      req.log?.warn?.({ err: lookupErr }, 'idempotency lookup failed');
      return next();
    }

    const originalJson = res.json.bind(res);
    let captured = null;
    res.json = (body) => {
      captured = body;
      return originalJson(body);
    };

    res.on('finish', async () => {
      try {
        if (res.statusCode < 200 || res.statusCode >= 300) return;
        if (captured === null) return;
        await prisma.idempotencyKey.upsert({
          where: { key_user_id: { key, user_id: userId } },
          create: { key, user_id: userId, endpoint, response: j({ status: res.statusCode, body: captured }) },
          update: { endpoint, response: j({ status: res.statusCode, body: captured }) },
        });
      } catch (err) {
        req.log?.warn?.({ err }, 'idempotency persist failed');
      }
    });

    next();
  };
}

export default idempotency;
