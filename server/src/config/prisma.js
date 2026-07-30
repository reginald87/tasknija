import { PrismaClient } from '@prisma/client';
import { logger } from '../middleware/logger.js';

// Singleton Prisma client (avoids multiple connections in dev watch mode).
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Translate Prisma known errors into codes the controllers expect.
export function prismaErrorCode(err) {
  if (!err) return null;
  // Prisma unique constraint violation
  if (err.code === 'P2002') return '23505';
  // Foreign key constraint failed
  if (err.code === 'P2003') return '23503';
  // Record not found (we mostly check manually)
  if (err.code === 'P2025') return 'PGRST116';
  return err.code || null;
}

export function isUniqueViolation(err) {
  return err?.code === 'P2002';
}

export function isNotFound(err) {
  return err?.code === 'P2025';
}

export { logger };
