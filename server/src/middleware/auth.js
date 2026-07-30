import { verifyToken, getUserById } from '../utils/auth.js';
import { AppError } from './errorHandler.js';
import { logger } from './logger.js';

export async function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const token = header.split(' ')[1];
    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    const profile = await getUserById(payload.sub);
    if (!profile) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    req.user = profile;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Authentication failed' });
  }
}

export async function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();
  try {
    const token = header.split(' ')[1];
    const payload = verifyToken(token);
    const profile = await getUserById(payload.sub);
    if (profile) req.user = profile;
  } catch (err) {
    // Invalid or expired token — proceed as anonymous (optionalAuth).
    logger.debug?.({ err }, 'optional auth failed');
  }
  next();
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' } });
    }
    if (!req.user.role) {
      return res.status(403).json({ success: false, error: { code: 'NO_ROLE', message: 'User role not assigned.' } });
    }
    // super_admin satisfies any admin check (review #4.16).
    const userRole = req.user.role;
    const allowed = roles.includes(userRole) || (roles.includes('admin') && userRole === 'super_admin');
    if (!allowed) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions.' } });
    }
    next();
  };
}
