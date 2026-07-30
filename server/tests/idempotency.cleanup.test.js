// Tests for the idempotency_keys daily cleanup job (review #idempotency-cleanup).
// Mocks prisma.idempotencyKey.deleteMany and the logger so the scheduler can be
// exercised without a live database or noisy log output.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { prisma } = vi.hoisted(() => {
  const idempotencyKey = {
    deleteMany: vi.fn().mockResolvedValue({ count: 42 }),
  };
  const prisma = { idempotencyKey };
  return { prisma };
});

vi.mock('../src/config/prisma.js', () => ({ prisma }));

vi.mock('../src/middleware/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { logger } from '../src/middleware/logger.js';
import { runCleanup } from '../src/jobs/cleanupIdempotency.js';

describe('idempotency cleanup scheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.IDEMPOTENCY_RETENTION_DAYS;
  });

  afterEach(() => {
    delete process.env.IDEMPOTENCY_RETENTION_DAYS;
  });

  it('runCleanup deletes keys older than retention and does not throw', async () => {
    prisma.idempotencyKey.deleteMany.mockResolvedValueOnce({ count: 42 });

    await expect(runCleanup()).resolves.not.toThrow();

    expect(prisma.idempotencyKey.deleteMany).toHaveBeenCalledTimes(1);
    const arg = prisma.idempotencyKey.deleteMany.mock.calls[0][0];
    expect(arg.where.created_at.lt).toBeInstanceOf(Date);
    // Default retention of 7 days => cutoff is ~7 days ago.
    const expectedCutoff = new Date(Date.now() - 7 * 86400000);
    const diffMs = Math.abs(arg.where.created_at.lt.getTime() - expectedCutoff.getTime());
    expect(diffMs).toBeLessThan(5000);
    expect(logger.info).toHaveBeenCalled();
  });

  it('runCleanup logs warning on error and does not throw', async () => {
    prisma.idempotencyKey.deleteMany.mockRejectedValueOnce(new Error('fail'));

    await expect(runCleanup()).resolves.not.toThrow();

    expect(logger.warn).toHaveBeenCalled();
  });

  it('runCleanup uses IDEMPOTENCY_RETENTION_DAYS env var when set', async () => {
    process.env.IDEMPOTENCY_RETENTION_DAYS = '14';
    prisma.idempotencyKey.deleteMany.mockResolvedValueOnce({ count: 0 });

    await runCleanup();

    expect(prisma.idempotencyKey.deleteMany).toHaveBeenCalledTimes(1);
    const arg = prisma.idempotencyKey.deleteMany.mock.calls[0][0];
    expect(arg.where.created_at.lt).toBeInstanceOf(Date);
    const expectedCutoff = new Date(Date.now() - 14 * 86400000);
    const diffMs = Math.abs(arg.where.created_at.lt.getTime() - expectedCutoff.getTime());
    expect(diffMs).toBeLessThan(5000);
  });
});
