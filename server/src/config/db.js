import { prisma } from './prisma.js';
import { logger } from '../middleware/logger.js';

// Replaces the old Supabase connection check. With SQLite/Prisma we simply
// verify the client can run a trivial query.
export async function connectDB() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connected');
  } catch (err) {
    logger.warn({ err }, 'Database connection warning');
  }
}
