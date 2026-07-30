// Tests for register endpoint — generic response to prevent email enumeration
// (review #4.4, #5.12 — vendor approval flow).

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
import { register } from '../src/controllers/authController.js';
import { createUser, getAuthUserByEmail } from '../src/utils/auth.js';

describe('register — no email enumeration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns generic message on success', async () => {
    getAuthUserByEmail.mockResolvedValueOnce(null);
    createUser.mockResolvedValueOnce({
      id: 'user-new',
      email: 'new@example.com',
      role: 'user',
    });

    const req = { body: { email: 'new@example.com', password: 'validpass1', fullName: 'New User' } };
    const res = { json: vi.fn().mockReturnThis(), status: vi.fn().mockReturnThis() };
    const next = vi.fn();

    await register(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.message).toMatch(/check your inbox/i);
  });

  it('returns SAME generic message when email already exists', async () => {
    getAuthUserByEmail.mockResolvedValueOnce({ id: 'taken-1', email: 'taken@example.com' });

    const req = { body: { email: 'taken@example.com', password: 'validpass1', fullName: 'Taken' } };
    const res = { json: vi.fn().mockReturnThis(), status: vi.fn().mockReturnThis() };
    const next = vi.fn();

    await register(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.message).toMatch(/check your inbox/i);
  });

  it('creates vendor_verifications row when role is vendor', async () => {
    getAuthUserByEmail.mockResolvedValueOnce(null);
    createUser.mockResolvedValueOnce({
      id: 'vendor-1',
      email: 'vendor@example.com',
      role: 'vendor',
    });

    const req = {
      body: {
        email: 'vendor@example.com',
        password: 'validpass1',
        fullName: 'Vendor User',
        role: 'vendor',
        businessName: 'Acme Plumbing',
      },
    };
    const res = { json: vi.fn().mockReturnThis(), status: vi.fn().mockReturnThis() };
    const next = vi.fn();

    await register(req, res, next);

    expect(next).not.toHaveBeenCalled();
    // vendor_verifications insert called with status='pending'.
    expect(prisma.vendorVerification.create).toHaveBeenCalled();
    const createArg = prisma.vendorVerification.create.mock.calls[0][0];
    expect(createArg.data.user_id).toBe('vendor-1');
    expect(createArg.data.business_name).toBe('Acme Plumbing');
    expect(createArg.data.status).toBe('pending');
  });

  it('does NOT create vendor_verifications row when role is user', async () => {
    getAuthUserByEmail.mockResolvedValueOnce(null);
    createUser.mockResolvedValueOnce({
      id: 'user-1',
      email: 'u@example.com',
      role: 'user',
    });

    const req = {
      body: { email: 'u@example.com', password: 'validpass1', fullName: 'Plain User' },
    };
    const res = { json: vi.fn().mockReturnThis(), status: vi.fn().mockReturnThis() };
    const next = vi.fn();

    await register(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(prisma.vendorVerification.create).not.toHaveBeenCalled();
  });

  it('rejects invalid email with VALIDATION_ERROR (does not enumerate)', async () => {
    const req = {
      body: { email: 'not-an-email', password: 'validpass1', fullName: 'Bad Email' },
    };
    const res = { json: vi.fn().mockReturnThis(), status: vi.fn().mockReturnThis() };
    const next = vi.fn();

    await register(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(getAuthUserByEmail).not.toHaveBeenCalled();
  });

  it('requires businessName when role is vendor', async () => {
    const req = {
      body: { email: 'v@example.com', password: 'validpass1', fullName: 'Vendor No Biz', role: 'vendor' },
    };
    const res = { json: vi.fn().mockReturnThis(), status: vi.fn().mockReturnThis() };
    const next = vi.fn();

    await register(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(getAuthUserByEmail).not.toHaveBeenCalled();
  });
});
