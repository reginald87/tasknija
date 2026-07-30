// Tests for login response — must include profile with role and is_verified
// (review #5.8).

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/config/prisma.js', () => {
  const model = () => ({
    findUnique: vi.fn().mockResolvedValue(null),
    findFirst: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    create: vi.fn().mockResolvedValue({}),
    createMany: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    updateMany: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    deleteMany: vi.fn().mockResolvedValue({}),
    upsert: vi.fn().mockResolvedValue({}),
  });
  const models = {};
  const names = [
    'profile', 'authUser', 'vendorVerification', 'business', 'category',
    'country', 'state', 'lga', 'city', 'review', 'conversation', 'message',
    'favorite', 'wallet', 'walletTransaction', 'transaction', 'escrowMilestone',
    'dispute', 'vendorSubscription', 'workProject', 'workUpdate', 'report',
    'vendorAvailability', 'vendorBlockedDate', 'platformConfig', 'adminAction',
    'idempotencyKey', 'fileUpload', 'passwordReset', 'subscriptionPackage',
    'notification', 'quote',
  ];
  for (const n of names) models[n] = model();
  models.$transaction = vi.fn((fn) =>
    typeof fn === 'function' ? fn(model()) : Promise.all(fn)
  );
  return { prisma: models };
});

vi.mock('../src/utils/auth.js', async (importOriginal) => ({
  ...(await importOriginal()),
  createUser: vi.fn(),
  getAuthUserByEmail: vi.fn(),
  getUserById: vi.fn(),
  hashPassword: vi.fn().mockResolvedValue('hash'),
  comparePassword: vi.fn().mockResolvedValue(true),
}));

import { prisma } from '../src/config/prisma.js';
import { login } from '../src/controllers/authController.js';
import { getAuthUserByEmail, comparePassword } from '../src/utils/auth.js';

describe('login — returns profile with role and is_verified', () => {
  beforeEach(() => vi.clearAllMocks());

  it('response includes user, profile with role and is_verified', async () => {
    getAuthUserByEmail.mockResolvedValueOnce({
      id: 'user-1',
      email: 'u@example.com',
      passwordHash: 'hashed',
    });
    comparePassword.mockResolvedValueOnce(true);
    prisma.profile.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      email: 'u@example.com',
      full_name: 'Test User',
      role: 'vendor',
      is_verified: true,
      avatar_url: null,
      phone: null,
    });

    const req = { body: { email: 'u@example.com', password: 'validpass1' } };
    const res = { json: vi.fn().mockReturnThis(), status: vi.fn().mockReturnThis() };
    const next = vi.fn();

    await login(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.user).toEqual({ id: 'user-1', email: 'u@example.com' });
    expect(payload.data.accessToken).toBeTruthy();
    expect(payload.data.refreshToken).toBeTruthy();
    expect(payload.data.profile).toBeTruthy();
    expect(payload.data.profile.role).toBe('vendor');
    expect(payload.data.profile.is_verified).toBe(true);
  });

  it('returns generic INVALID_CREDENTIALS for wrong password (no enumeration)', async () => {
    getAuthUserByEmail.mockResolvedValueOnce({
      id: 'user-1',
      email: 'u@example.com',
      passwordHash: 'hashed',
    });
    comparePassword.mockResolvedValueOnce(false);

    const req = { body: { email: 'u@example.com', password: 'wrongpass1' } };
    const next = vi.fn();

    await login(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('INVALID_CREDENTIALS');
    // Generic 401 for any credential failure.
    expect(err.message).toBeTruthy();
  });

  it('returns SAME generic INVALID_CREDENTIALS for unknown email', async () => {
    getAuthUserByEmail.mockResolvedValueOnce(null);

    const req = { body: { email: 'nobody@example.com', password: 'whatever1' } };
    const next = vi.fn();

    await login(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.code).toBe('INVALID_CREDENTIALS');
  });
});
