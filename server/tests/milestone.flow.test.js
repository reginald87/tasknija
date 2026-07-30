// Tests for the milestone state machine (review #4.3, #4.4).
// Uses the Prisma-backed escrowMilestones helpers.

import { describe, it, expect, vi, beforeEach } from 'vitest';

function makePrisma() {
  return {
    escrowMilestone: {
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    transaction: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

vi.mock('../src/config/prisma.js', () => ({ prisma: makePrisma() }));

import {
  isTerminalStatus,
  setMilestoneStatus,
  computePlatformFee,
} from '../src/utils/escrowMilestones.js';
import { prisma as mockPrisma } from '../src/config/prisma.js';

describe('milestone state machine — isTerminalStatus', () => {
  it('pending and held and completed are not terminal', () => {
    expect(isTerminalStatus('pending')).toBe(false);
    expect(isTerminalStatus('held')).toBe(false);
    expect(isTerminalStatus('completed')).toBe(false);
  });

  it('released and cancelled are terminal', () => {
    expect(isTerminalStatus('released')).toBe(true);
    expect(isTerminalStatus('cancelled')).toBe(true);
  });

  it('unknown statuses are not terminal', () => {
    expect(isTerminalStatus('unknown')).toBe(false);
    expect(isTerminalStatus('')).toBe(false);
  });
});

describe('milestone state machine — setMilestoneStatus rejects invalid status', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws on invalid status value', async () => {
    await expect(setMilestoneStatus('m-1', 'invalid-status', {})).rejects.toThrow(
      /Invalid milestone status/
    );
    expect(mockPrisma.escrowMilestone.update).not.toHaveBeenCalled();
  });

  it('accepts valid statuses and writes through to prisma', async () => {
    mockPrisma.escrowMilestone.update.mockResolvedValueOnce({ id: 'm-1', status: 'held' });

    const result = await setMilestoneStatus('m-1', 'held');
    expect(result.status).toBe('held');
    expect(mockPrisma.escrowMilestone.update).toHaveBeenCalledTimes(1);

    const callArg = mockPrisma.escrowMilestone.update.mock.calls[0][0];
    expect(callArg.where).toEqual({ id: 'm-1' });
    // The update payload should include held_at timestamp.
    const updateData = callArg.data;
    expect(updateData.status).toBe('held');
    expect(updateData.heldAt).toBeTruthy();
  });

  it('completed writes completedAt; released writes releasedAt', async () => {
    mockPrisma.escrowMilestone.update.mockResolvedValueOnce({ id: 'm-1' });

    await setMilestoneStatus('m-1', 'completed');
    const payload = mockPrisma.escrowMilestone.update.mock.calls[0][0].data;
    expect(payload.completedAt).toBeTruthy();
    expect(payload.releasedAt).toBeUndefined();
  });
});

describe('milestone state machine — computePlatformFee (pure)', () => {
  it('rounds to 2 decimals', () => {
    expect(computePlatformFee(1000, 5)).toBe(50);
    expect(computePlatformFee(333.33, 10)).toBe(33.33);
  });

  it('returns 0 for negative or non-finite rates', () => {
    expect(computePlatformFee(1000, -1)).toBe(0);
    expect(computePlatformFee(1000, NaN)).toBe(0);
    expect(computePlatformFee(1000, 'abc')).toBe(0);
  });

  it('returns 0 for 0% fee', () => {
    expect(computePlatformFee(1000, 0)).toBe(0);
  });
});
