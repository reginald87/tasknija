// Tests for atomic wallet operations (review #1.1, #1.2).
// Mocks prisma + wallet helpers to simulate atomic debit/refund behavior.

import { describe, it, expect, vi, beforeEach } from 'vitest';

function makePrisma() {
  return {
    wallet: {
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    withdrawalRequest: {
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    profile: {
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
  sendWithdrawalRequestNotification: vi.fn().mockResolvedValue(undefined),
}));

import { atomicWalletUpdate } from '../src/utils/wallet.js';
import { prisma as mockPrisma } from '../src/config/prisma.js';
import { requestWithdrawal } from '../src/controllers/paymentController.js';

function buildReqBody(amount = 5000) {
  // NOTE: schema uses snake_case (bank_account / bank_code), not camelCase.
  return {
    user: { id: 'user-1' },
    body: {
      amount,
      bank_account: '1234567890',
      bank_code: '044',
    },
  };
}

function buildRes() {
  return {
    json: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
  };
}

describe('requestWithdrawal — atomic balance check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.profile.findUnique.mockResolvedValue(null);
  });

  it('throws INSUFFICIENT_BALANCE when atomicWalletUpdate reports insufficient_balance', async () => {
    const err = new Error('insufficient_balance');
    err.code = 'P0001';
    atomicWalletUpdate.mockRejectedValueOnce(err);

    const req = buildReqBody();
    const res = buildRes();
    const next = vi.fn();

    await requestWithdrawal(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const errOut = next.mock.calls[0][0];
    expect(errOut.statusCode).toBe(400);
    expect(errOut.code).toBe('INSUFFICIENT_BALANCE');
    expect(res.status).not.toHaveBeenCalled();
  });

  it('throws WALLET_NOT_FOUND when user has no wallet', async () => {
    const err = new Error('wallet_not_found');
    err.code = 'P0002';
    atomicWalletUpdate.mockRejectedValueOnce(err);

    const req = buildReqBody();
    const res = buildRes();
    const next = vi.fn();

    await requestWithdrawal(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const errOut = next.mock.calls[0][0];
    expect(errOut.statusCode).toBe(404);
    expect(errOut.code).toBe('WALLET_NOT_FOUND');
  });

  it('proceeds and returns 201 when atomicWalletUpdate succeeds', async () => {
    atomicWalletUpdate.mockResolvedValueOnce({ user_id: 'user-1', balance: 5000 });
    mockPrisma.withdrawalRequest.create.mockResolvedValueOnce({ id: 'w-1', amount: 5000 });

    const req = buildReqBody();
    const res = buildRes();
    const next = vi.fn();

    await requestWithdrawal(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledTimes(1);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.wallet.balance).toBe(5000);
  });

  it('refunds the hold if withdrawalRequest create fails', async () => {
    // 1) atomic_wallet_update (debit) succeeds.
    atomicWalletUpdate.mockResolvedValueOnce({ user_id: 'user-1', balance: 5000 });
    // 2) Insert withdrawal_request fails.
    mockPrisma.withdrawalRequest.create.mockRejectedValueOnce(new Error('insert failed'));
    // 3) Refund atomicWalletUpdate (reversal) succeeds.
    atomicWalletUpdate.mockResolvedValueOnce({ user_id: 'user-1', balance: 5000 });

    const req = buildReqBody(7500);
    const res = buildRes();
    const next = vi.fn();

    await requestWithdrawal(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const errOut = next.mock.calls[0][0];
    expect(errOut.code).toBe('WITHDRAWAL_CREATE_FAILED');
    // Refund was called with positive delta to reverse the hold.
    expect(atomicWalletUpdate).toHaveBeenCalledTimes(2);
    const refundCall = atomicWalletUpdate.mock.calls[1];
    expect(refundCall[0].delta).toBe(7500);
  });
});
