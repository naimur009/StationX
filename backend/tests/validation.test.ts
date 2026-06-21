import { describe, it, expect } from 'vitest';
import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../src/modules/auth/auth.validation';

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

  it('strips unknown fields from parsed output', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'secret',
      extraField: 'should be stripped',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).extraField).toBeUndefined();
    }
  });
});

describe('forgotPasswordSchema', () => {
  it('accepts a valid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(true);
  });

  it('rejects missing email', () => {
    const result = forgotPasswordSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'bad' });
    expect(result.success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('accepts a valid token and password', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'abc123def456',
      newPassword: 'StrongPass1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects password shorter than 8 characters', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'abc123',
      newPassword: 'Short1A',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password without uppercase letter', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'abc123',
      newPassword: 'lowercase1',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes('uppercase'))).toBe(true);
    }
  });

  it('rejects password without lowercase letter', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'abc123',
      newPassword: 'UPPERCASE1',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes('lowercase'))).toBe(true);
    }
  });

  it('rejects password without digit', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'abc123',
      newPassword: 'NoDigitsA',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes('digit'))).toBe(true);
    }
  });

  it('rejects missing token', () => {
    const result = resetPasswordSchema.safeParse({ newPassword: 'StrongPass1' });
    expect(result.success).toBe(false);
  });
});
