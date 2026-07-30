// Tests for password complexity validation (review #5.9).

import { describe, it, expect } from 'vitest';
import { registerSchema } from '../src/utils/validation.js';

const baseValid = { email: 'a@b.com', fullName: 'Test User', password: 'validpass123' };

describe('password validation', () => {
  it('rejects passwords < 8 chars', () => {
    const r = registerSchema.safeParse({ ...baseValid, password: 'short1A' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => /8 characters/i.test(i.message))).toBe(true);
    }
  });

  it('rejects passwords without letters', () => {
    const r = registerSchema.safeParse({ ...baseValid, password: '12345678' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => /letter/i.test(i.message))).toBe(true);
    }
  });

  it('rejects passwords without numbers', () => {
    const r = registerSchema.safeParse({ ...baseValid, password: 'abcdefgh' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => /number/i.test(i.message))).toBe(true);
    }
  });

  it('accepts valid passwords', () => {
    const r = registerSchema.safeParse({ ...baseValid, password: 'validpass123' });
    expect(r.success).toBe(true);
  });

  it('accepts an 8-char password with at least one letter and one number', () => {
    const r = registerSchema.safeParse({ ...baseValid, password: 'abcd1234' });
    expect(r.success).toBe(true);
  });

  it('rejects invalid email format', () => {
    const r = registerSchema.safeParse({ ...baseValid, email: 'not-an-email' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => /email/i.test(i.message))).toBe(true);
    }
  });

  it('requires businessName when role is vendor', () => {
    const r = registerSchema.safeParse({ ...baseValid, role: 'vendor' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.join('.') === 'businessName')).toBe(true);
    }
  });

  it('accepts vendor with businessName', () => {
    const r = registerSchema.safeParse({
      ...baseValid,
      role: 'vendor',
      businessName: 'Acme Co',
    });
    expect(r.success).toBe(true);
  });

  it('rejects fullName < 2 chars', () => {
    const r = registerSchema.safeParse({ ...baseValid, fullName: 'A' });
    expect(r.success).toBe(false);
  });

  it('defaults role to user', () => {
    const r = registerSchema.safeParse(baseValid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.role).toBe('user');
  });
});
