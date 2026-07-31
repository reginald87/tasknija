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

export const verifyEmailSchema = z.object({
  email: z.string().email('Invalid email format.'),
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit verification code.')
});

export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email format.')
});

export const submitVerificationSchema = z.object({
  business_name: z.string().min(2, 'Business name must be at least 2 characters.').max(200).optional(),
  id_type: z.enum(['nin', 'driver_license', 'international_passport', 'voter_card', 'cac_certificate']),
  id_number: z.string().min(3, 'Enter a valid ID number.').max(50),
  notes: z.string().max(2000).optional(),
  documents: z.array(z.object({
    type: z.string().min(1),
    url: z.string().min(1),
    name: z.string().optional(),
  })).min(1, 'Upload at least one document.')
});
