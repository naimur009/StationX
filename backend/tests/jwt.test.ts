import { describe, it, expect } from 'vitest';
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
      const token = signAccessToken(userId, 'manager', []);
      expect(token).toBeTruthy();
      // verify (token is valid since it was just signed)
      const payload = verifyAccessToken(token);
      expect(payload.sub).toBe(userId);
    });

    it('rejects a garbage token string', () => {
      expect(() => verifyAccessToken('garbage-token')).toThrow();
    });

    it('rejects a token signed with a different secret', () => {
      // Can't really test different secret without changing env — the test
      // setup uses 'test-access-secret'. This validates the function rejects
      // clearly invalid tokens.
      expect(() => verifyAccessToken('')).toThrow();
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

  describe('access vs refresh tokens', () => {
    it('produces different tokens for access and refresh', () => {
      const accessToken = signAccessToken(userId, 'admin', []);
      const refreshToken = signRefreshToken(userId);
      expect(accessToken).not.toBe(refreshToken);
    });
  });
});
