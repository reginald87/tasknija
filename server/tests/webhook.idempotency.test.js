// Tests for Paystack webhook signature verification (review #4.8)
// and the idempotency contract for atomicWalletCredit.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

const { prisma, atomicWalletCredit } = vi.hoisted(() => {
  const wallet = {
    findUnique: vi.fn().mockResolvedValue({ id: 'wallet-1', balance: 0 }),
    create: vi.fn().mockResolvedValue({ id: 'wallet-1', balance: 0 }),
    update: vi.fn().mockResolvedValue({ id: 'wallet-1', balance: 5000 }),
  };
  const profile = {
    findUnique: vi.fn().mockResolvedValue(null),
  };
  const walletTransaction = {
    create: vi.fn().mockResolvedValue({ id: 'txn-1' }),
  };
  const prisma = { wallet, profile, walletTransaction, $transaction: vi.fn(async (cb) => cb(prisma)) };
  const atomicWalletCredit = vi.fn().mockResolvedValue({
    duplicate: false,
    balance: 5000,
    wallet: { id: 'wallet-1', balance: 5000 },
  });
  return { prisma, atomicWalletCredit };
});

vi.mock('../src/config/prisma.js', () => ({ prisma }));
vi.mock('../src/utils/wallet.js', () => ({ atomicWalletCredit }));

import { verifyPaystackSignature } from '../src/utils/paystack.js';
import { verifyDepositPayment } from '../src/controllers/paymentController.js';

describe('Paystack webhook signature', () => {
  it('verifies valid HMAC SHA512 signature', () => {
    process.env.PAYSTACK_SECRET_KEY = 'test-secret';
    const body = JSON.stringify({ event: 'charge.success', data: { reference: 'ref-1' } });
    const expected = crypto.createHmac('sha512', 'test-secret').update(body).digest('hex');

    expect(verifyPaystackSignature(body, expected)).toBe(true);
  });

  it('rejects invalid signature', () => {
    process.env.PAYSTACK_SECRET_KEY = 'test-secret';
    const body = JSON.stringify({ event: 'charge.success' });

    expect(verifyPaystackSignature(body, 'invalidsignature')).toBe(false);
  });

  it('rejects missing signature', () => {
    process.env.PAYSTACK_SECRET_KEY = 'test-secret';

    expect(verifyPaystackSignature('body', null)).toBe(false);
    expect(verifyPaystackSignature('body', undefined)).toBe(false);
  });

  it('rejects when secret not configured', () => {
    delete process.env.PAYSTACK_SECRET_KEY;
    delete process.env.PAYMENT_SECRET_KEY;

    expect(verifyPaystackSignature('body', 'sig')).toBe(false);
  });

  it('rejects when buffers differ in length (timing-safe guard)', () => {
    process.env.PAYSTACK_SECRET_KEY = 'test-secret';
    // Two-char signature is shorter than the 64-byte hex digest -> must reject.
    expect(verifyPaystackSignature('body', 'ab')).toBe(false);
  });
});

describe('verifyDepositPayment — atomicWalletCredit called with unique reference', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes reference_id and reference_type for dedup', async () => {
    // 1) paystackRequest fetch is patched via global.fetch.
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        status: true,
        data: {
          status: 'success',
          amount: 500000, // kobo = ₦5000
          metadata: { userId: 'user-42' },
          reference: 'DEP-unique-ref',
        },
      }),
    });

    atomicWalletCredit.mockResolvedValueOnce({
      duplicate: false,
      balance: 5000,
      wallet: { id: 'wallet-1', balance: 5000 },
    });

    const req = { user: { id: 'user-42' }, query: { reference: 'DEP-unique-ref' } };
    const res = { json: vi.fn().mockReturnThis(), status: vi.fn().mockReturnThis() };
    const next = vi.fn();

    await verifyDepositPayment(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(atomicWalletCredit).toHaveBeenCalledWith({
      userId: 'user-42',
      amount: 5000,
      referenceId: 'DEP-unique-ref',
      referenceType: 'paystack_deposit',
      description: 'Wallet deposit via Paystack (DEP-unique-ref)',
    });

    global.fetch = originalFetch;
  });

  it('treats duplicate (idempotent) credit as success', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        status: true,
        data: {
          status: 'success',
          amount: 100000,
          metadata: { userId: 'user-1' },
          reference: 'DEP-already-credited',
        },
      }),
    });

    atomicWalletCredit.mockResolvedValueOnce({
      duplicate: true,
      balance: 5000,
      wallet: { id: 'wallet-1', balance: 5000 },
    });

    const req = { user: { id: 'user-1' }, query: { reference: 'DEP-already-credited' } };
    const res = { json: vi.fn().mockReturnThis(), status: vi.fn().mockReturnThis() };
    const next = vi.fn();

    await verifyDepositPayment(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
    global.fetch = originalFetch;
  });

  it('returns 400 when reference query param is missing', async () => {
    const req = { user: { id: 'user-1' }, query: {} };
    const res = { json: vi.fn().mockReturnThis(), status: vi.fn().mockReturnThis() };
    const next = vi.fn();

    await verifyDepositPayment(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('MISSING_REFERENCE');
  });
});
