// Vitest global setup. Loads before any test file.
// Provides dummy env values so config loads without a real database.

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

process.env.PAYSTACK_SECRET_KEY ||= 'test-paystack';
process.env.PAYSTACK_PUBLIC_KEY ||= 'test-paystack-public';

// Silence logger output during tests unless explicitly enabled.
if (!process.env.LOG_LEVEL) process.env.LOG_LEVEL = 'silent';
