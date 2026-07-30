// Tests for adminController.releaseEscrow double-release guard (review #1.5).

import { describe, it, expect, vi, beforeEach } from 'vitest';

function makePrisma() {
  return {
    transaction: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    escrowMilestone: {
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    wallet: {
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

vi.mock('../src/config/prisma.js', () => ({ prisma: makePrisma() }));

vi.mock('../src/utils/wallet.js', () => ({
  holdEscrow: vi.fn(),
  releaseMilestoneToVendor: vi.fn(),
  atomicWalletUpdate: vi.fn(),
  atomicWalletCredit: vi.fn(),
}));

vi.mock('../src/utils/adminAudit.js', () => ({
  logAdminAction: vi.fn().mockResolvedValue(undefined),
  listAdminActions: vi.fn(),
}));

import { releaseMilestoneToVendor } from '../src/utils/wallet.js';
import { prisma as mockPrisma } from '../src/config/prisma.js';
import { releaseEscrow } from '../src/controllers/adminController.js';

describe('releaseEscrow — double-release guard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 ALREADY_RELEASED when tx.status === "released"', async () => {
    mockPrisma.transaction.findUnique.mockResolvedValueOnce({
      id: 'tx-1', status: 'released', amount: 5000,
    });

    const req = { user: { id: 'admin-1' }, params: { id: 'tx-1' } };
    const next = vi.fn();

    await releaseEscrow(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('ALREADY_RELEASED');
    expect(releaseMilestoneToVendor).not.toHaveBeenCalled();
  });

  it('rejects transactions in status "completed"', async () => {
    mockPrisma.transaction.findUnique.mockResolvedValueOnce({
      id: 'tx-1', status: 'completed', amount: 5000,
    });

    const req = { user: { id: 'admin-1' }, params: { id: 'tx-1' } };
    const next = vi.fn();

    await releaseEscrow(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('INVALID_STATUS');
    expect(releaseMilestoneToVendor).not.toHaveBeenCalled();
  });

  it('rejects transactions in status "cancelled"', async () => {
    mockPrisma.transaction.findUnique.mockResolvedValueOnce({
      id: 'tx-1', status: 'cancelled', amount: 5000,
    });

    const req = { user: { id: 'admin-1' }, params: { id: 'tx-1' } };
    const next = vi.fn();

    await releaseEscrow(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.code).toBe('INVALID_STATUS');
    expect(releaseMilestoneToVendor).not.toHaveBeenCalled();
  });

  it('returns 404 NOT_FOUND when transaction does not exist', async () => {
    mockPrisma.transaction.findUnique.mockResolvedValueOnce(null);

    const req = { user: { id: 'admin-1' }, params: { id: 'tx-missing' } };
    const next = vi.fn();

    await releaseEscrow(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.code).toBe('NOT_FOUND');
    expect(releaseMilestoneToVendor).not.toHaveBeenCalled();
  });

  it('allows release from "escrow" status and calls releaseMilestoneToVendor for each held/completed milestone', async () => {
    mockPrisma.transaction.findUnique.mockResolvedValueOnce({
      id: 'tx-1', status: 'escrow', amount: 5000,
    });
    // Milestones fetch — 1 held milestone.
    mockPrisma.escrowMilestone.findMany.mockResolvedValueOnce([
      { id: 'ms-1', status: 'held', amount: 5000, platform_fee: 100 },
    ]);
    // releaseMilestoneToVendor returns released milestone.
    releaseMilestoneToVendor.mockResolvedValueOnce({
      id: 'ms-1', status: 'released', amount: 5000, platform_fee: 100,
    });
    mockPrisma.transaction.update.mockResolvedValueOnce({
      id: 'tx-1', status: 'released',
    });

    const req = { user: { id: 'admin-1' }, params: { id: 'tx-1' } };
    const res = { json: vi.fn().mockReturnThis(), status: vi.fn().mockReturnThis() };
    const next = vi.fn();

    await releaseEscrow(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.transaction.status).toBe('released');
    expect(payload.data.releasedMilestones).toHaveLength(1);
    expect(payload.data.totalReleased).toBe(4900); // 5000 - 100 fee
    expect(releaseMilestoneToVendor).toHaveBeenCalledWith({ milestoneId: 'ms-1' });
  });

  it('allows release from "disputed" status', async () => {
    mockPrisma.transaction.findUnique.mockResolvedValueOnce({
      id: 'tx-1', status: 'disputed', amount: 2000,
    });
    mockPrisma.escrowMilestone.findMany.mockResolvedValueOnce([]);
    mockPrisma.transaction.update.mockResolvedValueOnce({
      id: 'tx-1', status: 'released',
    });

    const req = { user: { id: 'admin-1' }, params: { id: 'tx-1' } };
    const res = { json: vi.fn().mockReturnThis(), status: vi.fn().mockReturnThis() };
    const next = vi.fn();

    await releaseEscrow(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
    expect(releaseMilestoneToVendor).not.toHaveBeenCalled();
  });
});
