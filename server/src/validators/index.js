import { z } from 'zod';

export const createConversationSchema = z.object({
  vendorId: z.string().uuid('Invalid vendor ID'),
  businessId: z.string().uuid('Invalid business ID').optional(),
}).strict();

export const updateWorkProjectSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  progress: z.number().int().min(0).max(100).optional(),
}).strict();

export const createSubscriptionPackageSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional().default(''),
  features: z.array(z.string()).optional().default([]),
  prices: z.object({
    quarterly: z.number().min(0).optional().default(0),
    biannually: z.number().min(0).optional().default(0),
    annually: z.number().min(0).optional().default(0),
  }),
  recommended: z.boolean().optional().default(false),
}).strict();

export const subscribeSchema = z.object({
  packageId: z.string().uuid('Invalid package ID'),
  billingCycle: z.enum(['quarterly', 'biannually', 'annually']),
  paymentProofUrl: z.string().url('Invalid payment proof URL').optional(),
}).strict();

export const initializeSubscriptionSchema = z.object({
  packageId: z.string().uuid('Invalid package ID'),
  billingCycle: z.enum(['quarterly', 'biannually', 'annually']),
}).strict();

export const raiseDisputeSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(5000),
  evidence: z.array(z.string()).optional(),
}).strict();
