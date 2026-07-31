import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve .env from repo root first, then fall back to server/.env.
const rootEnv = path.resolve(__dirname, '..', '..', '..', '.env');
const serverEnv = path.resolve(__dirname, '..', '..', '.env');

if (existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else if (existsSync(serverEnv)) {
  dotenv.config({ path: serverEnv });
} else {
  // Last resort — let dotenv try its default lookup.
  dotenv.config();
}

export const config = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  refreshExpiresIn: process.env.REFRESH_EXPIRES_IN || '30d',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  facebookClientId: process.env.FACEBOOK_CLIENT_ID || '',
  githubClientId: process.env.GITHUB_CLIENT_ID || '',
  platformFeePercent: parseFloat(process.env.PLATFORM_FEE_PERCENT || '2'),
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY || process.env.PAYMENT_SECRET_KEY || '',
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || process.env.PAYMENT_PUBLIC_KEY || '',
  },
};
