// Tests for createTransaction (review #2.x — escrow-hold atomicity).
// Verifies that the controller delegates the entire hold to the wallet helper
// (holdEscrow), maps exception codes to AppError codes, and never performs a
// compensating prisma.wallet.update directly.

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
    wallet: {
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    business: {
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
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
  };
}

vi.mock('../src/config/prisma.js', () => ({ prisma: makePrisma() }));

vi.mock('../src/utils/wallet.js', () => ({
  holdEscrow: vi.fn(),
  releaseMilestoneToVendor: vi.fn(),
  atomicWalletUpdate: vi.fn(),
  atomicWalletCredit: vi.fn(),
}));

vi.mock('../src/utils/platformConfig.js', () => ({
  readPlatformConfig: vi.fn(() => ({ platformFeePercent: 2 })),
  writePlatformConfig: vi.fn(),
  getConfig: vi.fn(),
  getAllConfig: vi.fn(),
  setConfig: vi.fn(),
  clearCache: vi.fn(),
}));

import {
  holdEscrow,
  releaseMilestoneToVendor,
  atomicWalletUpdate,
  atomicWalletCredit,
} from '../src/utils/wallet.js';
import { prisma as mockPrisma } from '../src/config/prisma.js';
import { createTransaction } from '../src/controllers/transactionController.js';

function buildReq(amount = 5000, customerId = 'cust-1', businessId = 'biz-1') {
  return {
    user: { id: customerId },
    body: { businessId, amount },
  };
}

function buildRes() {
  return {
    json: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
  };
}

describe('createTransaction — hold_escrow atomicity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.transaction.findUnique.mockResolvedValue({
      id: 'tx-1',
      amount: 5000,
      platform_fee: 100,
      business: { name: 'Biz' },
      customer: { full_name: 'Cust' },
      vendor: { full_name: 'Vendor' },
    });
  });

  it('happy path: returns 201 with hydrated transaction row when holdEscrow succeeds', async () => {
    holdEscrow.mockResolvedValueOnce({
      id: 'tx-1',
      amount: 5000,
      platform_fee: 100,
    });

    const req = buildReq();
    const res = buildRes();
    const next = vi.fn();

    await createTransaction(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledTimes(1);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.id).toBe('tx-1');
    expect(payload.data.business.name).toBe('Biz');
  });

  it('maps P0001 insufficient_balance to AppError(400, INSUFFICIENT_BALANCE)', async () => {
    const err = new Error('insufficient_balance');
    err.code = 'P0001';
    holdEscrow.mockRejectedValueOnce(err);

    const req = buildReq();
    const res = buildRes();
    const next = vi.fn();

    await createTransaction(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const e = next.mock.calls[0][0];
    expect(e.statusCode).toBe(400);
    expect(e.code).toBe('INSUFFICIENT_BALANCE');
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('maps P0001 self_transaction_forbidden to AppError(400, SELF_TRANSACTION_FORBIDDEN)', async () => {
    const err = new Error('self_transaction_forbidden');
    err.code = 'P0001';
    holdEscrow.mockRejectedValueOnce(err);

    const req = buildReq();
    const res = buildRes();
    const next = vi.fn();

    await createTransaction(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const e = next.mock.calls[0][0];
    expect(e.statusCode).toBe(400);
    expect(e.code).toBe('SELF_TRANSACTION_FORBIDDEN');
    expect(res.status).not.toHaveBeenCalled();
  });

  it('maps P0002 wallet_not_found to AppError(404, WALLET_NOT_FOUND)', async () => {
    const err = new Error('wallet_not_found');
    err.code = 'P0002';
    holdEscrow.mockRejectedValueOnce(err);

    const req = buildReq();
    const res = buildRes();
    const next = vi.fn();

    await createTransaction(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const e = next.mock.calls[0][0];
    expect(e.statusCode).toBe(404);
    expect(e.code).toBe('WALLET_NOT_FOUND');
    expect(res.status).not.toHaveBeenCalled();
  });

  it('maps P0002 business_not_found to AppError(404, BUSINESS_NOT_FOUND)', async () => {
    const err = new Error('business_not_found');
    err.code = 'P0002';
    holdEscrow.mockRejectedValueOnce(err);

    const req = buildReq();
    const res = buildRes();
    const next = vi.fn();

    await createTransaction(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const e = next.mock.calls[0][0];
    expect(e.statusCode).toBe(404);
    expect(e.code).toBe('BUSINESS_NOT_FOUND');
    expect(res.status).not.toHaveBeenCalled();
  });

  it('never performs a compensating prisma.wallet.update on success', async () => {
    holdEscrow.mockResolvedValueOnce({
      id: 'tx-1',
      amount: 5000,
      platform_fee: 100,
    });

    const req = buildReq();
    const res = buildRes();
    const next = vi.fn();

    await createTransaction(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);

    // The controller must delegate balance mutation to the wallet helper; it
    // must not call prisma.wallet.update directly for the balance hold.
    expect(mockPrisma.wallet.update).not.toHaveBeenCalled();
    expect(releaseMilestoneToVendor).not.toHaveBeenCalled();
    expect(atomicWalletUpdate).not.toHaveBeenCalled();
    expect(atomicWalletCredit).not.toHaveBeenCalled();
  });

  it('computes platform_fee = 2% of amount and passes it to holdEscrow (amount=5000 → fee=100)', async () => {
    holdEscrow.mockResolvedValueOnce({
      id: 'tx-1',
      amount: 5000,
      platform_fee: 100,
    });

    const req = buildReq(5000);
    const res = buildRes();
    const next = vi.fn();

    await createTransaction(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);

    expect(holdEscrow).toHaveBeenCalledTimes(1);
    const callArg = holdEscrow.mock.calls[0][0];
    expect(callArg.amount).toBe(5000);
    expect(callArg.platformFee).toBe(100);
    expect(callArg.customerId).toBe('cust-1');
    expect(callArg.businessId).toBe('biz-1');
  });
});
