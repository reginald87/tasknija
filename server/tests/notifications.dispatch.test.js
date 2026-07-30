// Tests for the notifications dispatch helper (Chunk 1 of
// .kimchi/docs/plan-notifications-table.md). Mocks prisma.notification.create and the
// logger so the helper can be exercised without a live database or noisy
// log output. The helper is best-effort: it must never throw.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { prisma } = vi.hoisted(() => {
  const notification = {
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn().mockResolvedValue(null),
    count: vi.fn().mockResolvedValue(0),
    create: vi.fn().mockResolvedValue({ id: 'notif-1' }),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
  };
  const prisma = { notification };
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
import { sendNotification, sendNotificationToMany } from '../src/utils/notifications.js';

describe('notifications dispatch helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('happy path: insert succeeds and returns { id }', async () => {
    prisma.notification.create.mockResolvedValueOnce({ id: 'notif-1' });

    const result = await sendNotification({
      userId: 'user-1',
      type: 'deposit_success',
      title: 'Deposit successful',
      body: 'Your wallet has been credited.',
      data: { amount: 5000 },
      link: '/dashboard',
    });

    expect(result).toEqual({ id: 'notif-1' });
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        user_id: 'user-1',
        type: 'deposit_success',
        title: 'Deposit successful',
        body: 'Your wallet has been credited.',
        data: JSON.stringify({ amount: 5000 }),
        link: '/dashboard',
      },
      select: { id: true },
    });
  });

  it('missing userId: returns null and logs warning', async () => {
    const result = await sendNotification({
      type: 'deposit_success',
      title: 'Deposit successful',
      body: 'Your wallet has been credited.',
    });

    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('invalid type: returns null and does not call prisma', async () => {
    const result = await sendNotification({
      userId: 'user-1',
      type: 'invalid_type',
      title: 'X',
      body: 'Y',
    });

    expect(result).toBeNull();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('prisma throws (simulated failure): returns null and logs warning', async () => {
    prisma.notification.create.mockRejectedValueOnce(new Error('insert failed'));

    const result = await sendNotification({
      userId: 'user-1',
      type: 'deposit_success',
      title: 'Deposit successful',
      body: 'Your wallet has been credited.',
    });

    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('prisma throws: returns null and does not propagate', async () => {
    prisma.notification.create.mockRejectedValueOnce(new Error('boom'));

    const result = await sendNotification({
      userId: 'user-1',
      type: 'deposit_success',
      title: 'Deposit successful',
      body: 'Your wallet has been credited.',
    });

    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('sendNotificationToMany: returns count of successful inserts', async () => {
    // Three user ids. Make prisma.create fail for user-b (returns null) so the
    // helper counts only the two successful inserts.
    prisma.notification.create.mockImplementation(({ data }) =>
      data.user_id === 'user-b'
        ? Promise.resolve(null)
        : Promise.resolve({ id: `notif-for-${data.user_id}` })
    );

    const count = await sendNotificationToMany(
      ['user-a', 'user-b', 'user-c'],
      {
        type: 'deposit_success',
        title: 'Deposit successful',
        body: 'Your wallet has been credited.',
      }
    );

    expect(count).toBe(2);
  });
});
