import { describe, it, expect } from 'vitest';
import { loginSchema } from '../src/modules/auth/auth.validation';

describe('loginSchema', () => {
  it('accepts valid email and password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'secret' });
    expect(result.success).toBe(true);
  });

  it('rejects missing email', () => {
    const result = loginSchema.safeParse({ password: 'secret' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('email');
    }
  });

  it('rejects missing password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('password');
    }
  });

  it('rejects malformed email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret' });
    expect(result.success).toBe(false);
  });

  it('rejects email over 254 characters', () => {
    const longEmail = 'a'.repeat(250) + '@b.com';
    const result = loginSchema.safeParse({ email: longEmail, password: 'secret' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'secret',
      extraField: 'should be rejected',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.code === 'unrecognized_keys')).toBe(true);
    }
  });
});
