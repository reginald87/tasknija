import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { prisma } from '../config/prisma.js';

function getSecret() {
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET is not set. Add it to your .env file.');
  }
  return config.jwtSecret;
}

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    getSecret(),
    { expiresIn: config.jwtExpiresIn }
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, type: 'refresh' },
    getSecret(),
    { expiresIn: config.refreshExpiresIn }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, getSecret());
}

export async function hashPassword(password) {
  return bcrypt.hash(password, config.bcryptRounds || 10);
}

export function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// Password-reset token helpers (opaque random token, stored hashed).
export function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Load a user (with profile fields) by id. Returns the profile row.
 */
export async function getUserById(id) {
  return prisma.profile.findUnique({ where: { id } });
}

/**
 * Create a user + profile (registration). Password stored hashed in an
 * auth_users table; profile mirrors id/email/role.
 */
export async function createUser({ email, password, fullName, role }) {
  const passwordHash = await hashPassword(password);
  const id = crypto.randomUUID();
  return prisma.$transaction(async (tx) => {
    // Profile is the primary row; AuthUser.id is a FK to Profile.id.
    const profile = await tx.profile.create({
      data: {
        id,
        email,
        full_name: fullName || null,
        role: role || 'user',
      },
    });
    await tx.authUser.create({
      data: { id: profile.id, email, passwordHash },
    });
    return profile;
  });
}

export async function getAuthUserByEmail(email) {
  return prisma.authUser.findUnique({ where: { email } });
}

/**
 * Find an existing profile by email, or create one for an OAuth identity
 * (Google). OAuth users have no password — we store a random hash so the
 * account can never be used with password login. Returns the profile row.
 */
export async function findOrCreateOAuthUser({ email, fullName, avatarUrl, role = 'user' }) {
  const existing = await prisma.profile.findUnique({ where: { email } });
  if (existing) return existing;

  const passwordHash = await hashPassword(crypto.randomBytes(32).toString('hex'));
  const id = crypto.randomUUID();
  return prisma.$transaction(async (tx) => {
    // Profile is the primary row; AuthUser.id is a FK to Profile.id.
    const profile = await tx.profile.create({
      data: {
        id,
        email,
        full_name: fullName || null,
        avatar_url: avatarUrl || null,
        role,
        is_verified: true,
      },
    });
    await tx.authUser.create({
      data: { id: profile.id, email, passwordHash },
    });
    return profile;
  });
}

/**
 * Verify a Google ID token (issued by the Android/iOS/Web client) by calling
 * Google's tokeninfo endpoint. Returns the decoded payload (sub, email,
 * name, picture, email_verified) or throws.
 */
export async function verifyGoogleIdToken(idToken) {
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  );
  if (!res.ok) {
    throw new Error('GOOGLE_TOKEN_INVALID');
  }
  const payload = await res.json();
  if (!payload.email) {
    throw new Error('GOOGLE_TOKEN_NO_EMAIL');
  }
  // Optional audience check (guard against token issued for another client).
  const expectedClientId = config.googleClientId;
  if (expectedClientId && payload.aud && payload.aud !== expectedClientId) {
    throw new Error('GOOGLE_TOKEN_AUDIENCE_MISMATCH');
  }
  return payload;
}
