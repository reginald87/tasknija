// Vitest global setup. Loads before any test file.
// Provides dummy env values so config loads without a real database.

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

process.env.SUPABASE_URL ||= 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key';
process.env.SUPABASE_ANON_KEY ||= 'test-anon-key';
process.env.PAYSTACK_SECRET_KEY ||= 'test-paystack';
process.env.PAYSTACK_PUBLIC_KEY ||= 'test-paystack-public';
process.env.SUPABASE_JWT_SECRET ||= 'test-jwt-secret';

// Silence logger output during tests unless explicitly enabled.
if (!process.env.LOG_LEVEL) process.env.LOG_LEVEL = 'silent';
