// Tests for businessController.update — whitelist enforcement (review #1.3, #4.6).

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { prisma } = vi.hoisted(() => {
  const business = {
    findUnique: vi.fn().mockResolvedValue({ owner_id: 'owner-1' }),
    update: vi.fn().mockResolvedValue({ id: 'biz-1', name: 'Renamed' }),
    create: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  };
  const category = {
    findUnique: vi.fn().mockResolvedValue({ id: 'cat-1' }),
  };
  const prisma = { business, category };
  return { prisma };
});

vi.mock('../src/config/prisma.js', () => ({ prisma }));

vi.mock('../src/utils/businessMeta.js', () => ({
  getServiceTerms: vi.fn().mockResolvedValue(''),
  setServiceTerms: vi.fn().mockResolvedValue(undefined),
  deleteBusinessMeta: vi.fn(),
}));

vi.mock('../src/utils/subscriptionData.js', () => ({
  readVendorSubs: vi.fn().mockResolvedValue([]),
  writeVendorSubs: vi.fn().mockResolvedValue(undefined),
}));

import { update } from '../src/controllers/businessController.js';

describe('businessController.update — whitelist enforcement', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects verification_status in body', async () => {
    prisma.business.findUnique.mockResolvedValueOnce({ owner_id: 'owner-1' });

    const req = {
      user: { id: 'owner-1', role: 'user' },
      params: { id: 'biz-1' },
      body: { name: 'New Name', verification_status: 'verified' },
    };
    const next = vi.fn();

    await update(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.code).toBe('FORBIDDEN_FIELDS');
    expect(err.details.forbiddenFields).toContain('verification_status');
    expect(prisma.business.update).not.toHaveBeenCalled();
  });

  it('rejects rating_avg in body', async () => {
    prisma.business.findUnique.mockResolvedValueOnce({ owner_id: 'owner-1' });

    const req = {
      user: { id: 'owner-1', role: 'user' },
      params: { id: 'biz-1' },
      body: { rating_avg: 5 },
    };
    const next = vi.fn();

    await update(req, {}, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].code).toBe('FORBIDDEN_FIELDS');
  });

  it('rejects is_featured in body', async () => {
    prisma.business.findUnique.mockResolvedValueOnce({ owner_id: 'owner-1' });

    const req = {
      user: { id: 'owner-1', role: 'user' },
      params: { id: 'biz-1' },
      body: { is_featured: true },
    };
    const next = vi.fn();

    await update(req, {}, next);

    expect(next.mock.calls[0][0].code).toBe('FORBIDDEN_FIELDS');
  });

  it('rejects owner_id transfer attempt', async () => {
    prisma.business.findUnique.mockResolvedValueOnce({ owner_id: 'owner-1' });

    const req = {
      user: { id: 'owner-1', role: 'user' },
      params: { id: 'biz-1' },
      body: { owner_id: 'attacker-id' },
    };
    const next = vi.fn();

    await update(req, {}, next);

    expect(next.mock.calls[0][0].code).toBe('FORBIDDEN_FIELDS');
  });

  it('rejects non-owner trying to edit (FORBIDDEN, not FORBIDDEN_FIELDS)', async () => {
    // Mock business fetch returning owner_id != req.user.id.
    prisma.business.findUnique.mockResolvedValueOnce({ owner_id: 'real-owner' });

    const req = {
      user: { id: 'attacker', role: 'user' },
      params: { id: 'biz-1' },
      body: { name: 'Hacked' },
    };
    const next = vi.fn();

    await update(req, {}, next);

    expect(next.mock.calls[0][0].code).toBe('FORBIDDEN');
  });

  it('rejects multiple forbidden fields and lists them all', async () => {
    prisma.business.findUnique.mockResolvedValueOnce({ owner_id: 'owner-1' });

    const req = {
      user: { id: 'owner-1', role: 'user' },
      params: { id: 'biz-1' },
      body: {
        verification_status: 'verified',
        rating_avg: 5,
        is_featured: true,
      },
    };
    const next = vi.fn();

    await update(req, {}, next);

    expect(next.mock.calls[0][0].code).toBe('FORBIDDEN_FIELDS');
    const forbidden = next.mock.calls[0][0].details.forbiddenFields;
    expect(forbidden).toContain('verification_status');
    expect(forbidden).toContain('rating_avg');
    expect(forbidden).toContain('is_featured');
  });

  it('allows owner to update whitelisted fields', async () => {
    prisma.business.findUnique.mockResolvedValueOnce({ owner_id: 'owner-1' });
    prisma.business.update.mockResolvedValueOnce({ id: 'biz-1', name: 'Renamed' });

    const req = {
      user: { id: 'owner-1', role: 'user' },
      params: { id: 'biz-1' },
      body: { name: 'Renamed', description: 'New description' },
    };
    const res = { json: vi.fn().mockReturnThis(), status: vi.fn().mockReturnThis() };
    const next = vi.fn();

    await update(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
    expect(prisma.business.update).toHaveBeenCalledTimes(1);
    const updateArg = prisma.business.update.mock.calls[0][0];
    // Only allowed fields are passed; forbidden fields are excluded.
    expect(updateArg.data).toHaveProperty('name', 'Renamed');
    expect(updateArg.data).toHaveProperty('description', 'New description');
    expect(updateArg.data).not.toHaveProperty('verification_status');
    expect(updateArg.data).not.toHaveProperty('is_featured');
    expect(updateArg.data).not.toHaveProperty('owner_id');
  });
});
