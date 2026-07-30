// Tests for confirmMilestone (review #1.10, #4.21, #4.4).
// Verifies authorization, state guard, helper invocation, and platform_fee bookkeeping.

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

vi.mock('../src/utils/notifications.js', () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}));

import {
  releaseMilestoneToVendor,
} from '../src/utils/wallet.js';
import { prisma as mockPrisma } from '../src/config/prisma.js';
import { confirmMilestone } from '../src/controllers/transactionController.js';

describe('confirmMilestone — vendor receives net of fee', () => {
  beforeEach(() => vi.clearAllMocks());

  it('only allows the transaction customer to confirm', async () => {
    mockPrisma.transaction.findUnique.mockResolvedValueOnce({
      id: 'tx-1', customer_id: 'cust-1', vendor_id: 'v-1', platform_fee: 0,
    });

    const req = { user: { id: 'someone-else' }, params: { id: 'tx-1', milestoneId: 'ms-1' } };
    const next = vi.fn();

    await confirmMilestone(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
    expect(releaseMilestoneToVendor).not.toHaveBeenCalled();
  });

  it('rejects milestone in non-completed status', async () => {
    mockPrisma.transaction.findUnique.mockResolvedValueOnce({
      id: 'tx-1', customer_id: 'cust-1', vendor_id: 'v-1', platform_fee: 0,
    });
    mockPrisma.escrowMilestone.findFirst.mockResolvedValueOnce({
      id: 'ms-1',
      transaction_id: 'tx-1',
      status: 'held',
      amount: 1000,
      platform_fee: 50,
    });

    const req = { user: { id: 'cust-1' }, params: { id: 'tx-1', milestoneId: 'ms-1' } };
    const next = vi.fn();

    await confirmMilestone(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('INVALID_STATE');
    expect(err.message).toMatch(/held/);
    expect(releaseMilestoneToVendor).not.toHaveBeenCalled();
  });

  it('rejects when milestone not found scoped to transaction', async () => {
    mockPrisma.transaction.findUnique.mockResolvedValueOnce({
      id: 'tx-1', customer_id: 'cust-1', vendor_id: 'v-1', platform_fee: 0,
    });
    mockPrisma.escrowMilestone.findFirst.mockResolvedValueOnce(null);

    const req = { user: { id: 'cust-1' }, params: { id: 'tx-1', milestoneId: 'ms-missing' } };
    const next = vi.fn();

    await confirmMilestone(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.code).toBe('NOT_FOUND');
    expect(releaseMilestoneToVendor).not.toHaveBeenCalled();
  });

  it('calls releaseMilestoneToVendor and updates platform_fee running total', async () => {
    mockPrisma.transaction.findUnique.mockResolvedValueOnce({
      id: 'tx-1',
      customer_id: 'cust-1',
      vendor_id: 'v-1',
      platform_fee: 100, // running total so far
    });
    mockPrisma.escrowMilestone.findFirst.mockResolvedValueOnce({
      id: 'ms-1',
      transaction_id: 'tx-1',
      status: 'completed',
      amount: 1000,
      platform_fee: 50, // this milestone's fee
    });
    releaseMilestoneToVendor.mockResolvedValueOnce({
      id: 'ms-1', status: 'released', amount: 1000, platform_fee: 50,
    });
    mockPrisma.transaction.update.mockResolvedValueOnce({
      id: 'tx-1',
      platform_fee: 150, // 100 + 50
    });
    mockPrisma.escrowMilestone.findMany.mockResolvedValueOnce([
      { status: 'released' },
    ]);

    const req = { user: { id: 'cust-1' }, params: { id: 'tx-1', milestoneId: 'ms-1' } };
    const res = { json: vi.fn().mockReturnThis(), status: vi.fn().mockReturnThis() };
    const next = vi.fn();

    await confirmMilestone(req, res, next);

    // Verify the helper was called with the right milestone id.
    expect(releaseMilestoneToVendor).toHaveBeenCalledTimes(1);
    expect(releaseMilestoneToVendor).toHaveBeenCalledWith({ milestoneId: 'ms-1' });

    // Verify the platform_fee running total update was attempted (the
    // controller may also update the tx status when all milestones release).
    expect(mockPrisma.transaction.update).toHaveBeenCalled();
    const feeUpdateCall = mockPrisma.transaction.update.mock.calls.find(
      (c) => c[0].data && c[0].data.platform_fee === 150
    );
    expect(feeUpdateCall).toBeTruthy();
    const txUpdateArg = feeUpdateCall[0].data;
    expect(txUpdateArg.platform_fee).toBe(150); // 100 + 50

    // No direct wallet mutation from the controller.
    expect(mockPrisma.wallet.update).not.toHaveBeenCalled();
  });
});
