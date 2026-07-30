import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export async function listForUser(userId, { page = 1, limit = 20 } = {}) {
  if (!userId) throw new AppError(400, 'MISSING_USER', 'userId is required.');
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (safePage - 1) * safeLimit;

  const [data, total] = await Promise.all([
    prisma.withdrawalRequest.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: safeLimit,
    }),
    prisma.withdrawalRequest.count({ where: { user_id: userId } }),
  ]);
  return { data, total, page: safePage, limit: safeLimit };
}

export async function listAll({ status = null, page = 1, limit = 20 } = {}) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (safePage - 1) * safeLimit;

  const where = status ? { status } : {};
  const [data, total] = await Promise.all([
    prisma.withdrawalRequest.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: safeLimit,
    }),
    prisma.withdrawalRequest.count({ where }),
  ]);
  return { data, total, page: safePage, limit: safeLimit };
}

export async function getById(id) {
  const data = await prisma.withdrawalRequest.findUnique({ where: { id } });
  if (!data) throw new AppError(404, 'NOT_FOUND', 'Withdrawal request not found.');
  return data;
}

export async function create({ userId, amount, bankAccount, bankCode }) {
  if (!userId) throw new AppError(400, 'MISSING_USER', 'userId is required.');
  const amt = parseFloat(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    throw new AppError(400, 'INVALID_AMOUNT', 'amount must be a positive number.');
  }
  return prisma.withdrawalRequest.create({
    data: {
      user_id: userId,
      amount: amt,
      bank_code: bankCode || null,
      account_number: bankAccount || null,
      status: 'pending',
    },
  });
}

export async function updateStatus(id, status, adminId = null, adminNote = null) {
  const updates = { status, updated_at: new Date() };
  if (adminId) updates.processed_by = adminId;
  if (adminNote !== null) updates.admin_note = adminNote;
  if (status === 'approved' || status === 'rejected' || status === 'completed') {
    updates.processed_at = new Date();
  }
  return prisma.withdrawalRequest.update({ where: { id }, data: updates });
}

export async function createRequest({ userId, amount, bankName, accountNumber, accountName }) {
  if (!userId) throw new AppError(400, 'MISSING_USER', 'userId is required.');
  const amt = parseFloat(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    throw new AppError(400, 'INVALID_AMOUNT', 'amount must be a positive number.');
  }
  return prisma.withdrawalRequest.create({
    data: {
      user_id: userId,
      amount: amt,
      bank_name: bankName,
      account_number: accountNumber,
      account_name: accountName,
      status: 'pending',
    },
  });
}

export async function getUserRequests(userId) {
  if (!userId) return [];
  return prisma.withdrawalRequest.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
  });
}

export async function getAllRequests(status) {
  const where = status ? { status } : {};
  return prisma.withdrawalRequest.findMany({ where, orderBy: { created_at: 'desc' } });
}

export async function approveRequest(id, adminId, note) {
  return updateStatus(id, 'approved', adminId, note || '');
}

export async function rejectRequest(id, adminId, note) {
  return updateStatus(id, 'rejected', adminId, note || '');
}
