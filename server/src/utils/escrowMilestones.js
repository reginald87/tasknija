import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

const MILESTONE_STATUSES = ['pending', 'held', 'completed', 'released', 'cancelled'];
const TERMINAL_STATUSES = ['released', 'cancelled'];

function assertValidStatus(status) {
  if (!MILESTONE_STATUSES.includes(status)) {
    throw new AppError(400, 'INVALID_STATUS', `Invalid milestone status: ${status}`);
  }
}

function timestampFor(status) {
  const now = new Date();
  switch (status) {
    case 'held':      return { heldAt: now };
    case 'completed': return { completedAt: now };
    case 'released':  return { releasedAt: now };
    case 'cancelled': return { cancelledAt: now };
    default:          return {};
  }
}

export async function getMilestonesForTransaction(transactionId) {
  return prisma.escrowMilestone.findMany({
    where: { transaction_id: transactionId },
    orderBy: { created_at: 'asc' },
  });
}

export async function getMilestones(transactionId) {
  return getMilestonesForTransaction(transactionId);
}

export async function getMilestone(id) {
  const data = await prisma.escrowMilestone.findUnique({
    where: { id },
    include: { transaction: true },
  });
  if (!data) throw new AppError(404, 'NOT_FOUND', 'Milestone not found.');
  return data;
}

export async function setMilestoneStatus(id, status, extras = {}) {
  assertValidStatus(status);
  return prisma.escrowMilestone.update({
    where: { id },
    data: { status, ...timestampFor(status), ...extras },
  });
}

export function isTerminalStatus(status) {
  return TERMINAL_STATUSES.includes(status);
}

export function computePlatformFee(amount, feeRatePercent) {
  const rate = Number(feeRatePercent);
  if (!Number.isFinite(rate) || rate < 0) return 0;
  return Math.round((Number(amount) || 0) * (rate / 100) * 100) / 100;
}

export async function setMilestones(transactionId, milestones) {
  const existing = await prisma.escrowMilestone.findMany({
    where: { transaction_id: transactionId },
    select: { id: true },
  });
  const incomingIds = new Set((milestones || []).map((m) => m.id).filter(Boolean));
  const orphans = existing.map((r) => r.id).filter((id) => !incomingIds.has(id));
  if (orphans.length > 0) {
    await prisma.escrowMilestone.deleteMany({ where: { id: { in: orphans } } });
  }

  if (!milestones || milestones.length === 0) return [];

  const rows = milestones.map((m) => ({
    id: m.id,
    transaction_id: transactionId,
    name: m.name || m.description || '',
    amount: parseFloat(m.amount) || 0,
    status: m.status || 'pending',
    platform_fee: parseFloat(m.platform_fee || 0),
    releasedAt: m.released_at || null,
    heldAt: m.held_at || null,
    completedAt: m.completed_at || null,
    cancelledAt: m.cancelled_at || null,
  }));

  const result = [];
  for (const row of rows) {
    const upserted = await prisma.escrowMilestone.upsert({
      where: { id: row.id },
      create: row,
      update: row,
    });
    result.push(upserted);
  }
  return result;
}

export async function updateMilestoneStatus(transactionId, milestoneId, status) {
  assertValidStatus(status);
  return prisma.escrowMilestone.update({
    where: { id: milestoneId, transaction_id: transactionId },
    data: { status, ...timestampFor(status) },
  });
}

export async function getNextPendingMilestone(transactionId) {
  return prisma.escrowMilestone.findFirst({
    where: { transaction_id: transactionId, status: 'pending' },
    orderBy: { created_at: 'asc' },
  });
}
