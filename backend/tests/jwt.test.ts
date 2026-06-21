import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from '../src/lib/jwt';

describe('JWT', () => {
  const userId = '507f1f77bcf86cd799439011';
  const permissions = [{ module: 'pos', actions: ['view', 'create'] }];

  describe('signAccessToken / verifyAccessToken', () => {
    it('signs and verifies an access token with userId, role, and permissions', () => {
      const token = signAccessToken(userId, 'admin', permissions);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      const payload = verifyAccessToken(token);
      expect(payload.sub).toBe(userId);
      expect(payload.role).toBe('admin');
      expect(payload.permissions).toEqual(permissions);
    });

    it('rejects an expired token', () => {
      const expiredToken = jwt.sign(
        { sub: userId, role: 'manager', permissions: [] },
        process.env.JWT_ACCESS_SECRET || 'test-access-secret',
        { expiresIn: '0s' }
      );

      expect(() => verifyAccessToken(expiredToken)).toThrow();
    });

    it('rejects a garbage token string', () => {
      expect(() => verifyAccessToken('garbage-token')).toThrow();
    });
  });

  describe('signRefreshToken / verifyRefreshToken', () => {
    it('signs and verifies a refresh token with userId', () => {
      const token = signRefreshToken(userId);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      const payload = verifyRefreshToken(token);
      expect(payload.sub).toBe(userId);
    });

    it('rejects a garbage refresh token string', () => {
      expect(() => verifyRefreshToken('garbage-token')).toThrow();
    });
  });
});
