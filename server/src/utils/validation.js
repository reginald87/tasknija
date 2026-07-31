import { z } from 'zod';

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters.')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter.')
  .regex(/[0-9]/, 'Password must contain at least one number.');

export const registerSchema = z.object({
  email: z.string().email('Invalid email format.'),
  password: passwordSchema,
  fullName: z.string().min(2, 'Full name must be at least 2 characters.').max(100),
  role: z.enum(['user', 'vendor', 'property_owner']).optional().default('user'),
  businessName: z.string().min(2).max(200).optional(),
  listingType: z.enum(['sale', 'rent', 'lease']).optional(),
  propertyType: z.enum(['apartment', 'duplex', 'bungalow', 'terraced', 'detached', 'penthouse', 'land', 'commercial']).optional(),
  bedrooms: z.coerce.number().int().min(0).max(20).optional(),
  isDirectFromOwner: z.boolean().optional()
}).refine(data => data.role !== 'vendor' || data.businessName, {
  message: 'businessName is required when registering as a vendor.',
  path: ['businessName']
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format.'),
  password: z.string().min(1, 'Password is required.')
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format.')
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordSchema
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1)
});

export const googleSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required.')
});
