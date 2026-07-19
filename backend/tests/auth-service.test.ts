import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import User from '../src/models/User';
import * as authService from '../src/modules/auth/auth.service';

vi.mock('../src/models/User');
vi.mock('../src/models/ActivityLog', () => ({
  default: { create: vi.fn().mockResolvedValue({}) },
}));
vi.mock('../src/lib/jwt');
vi.mock('bcrypt', () => ({
  default: {
    hashSync: vi.fn().mockReturnValue('dummy-hash'),
    compare: vi.fn(),
    hash: vi.fn().mockResolvedValue('hashed-password'),
  },
  hashSync: vi.fn().mockReturnValue('dummy-hash'),
  compare: vi.fn(),
  hash: vi.fn().mockResolvedValue('hashed-password'),
}));

describe('authService.login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns same error for nonexistent email and wrong password (timing)', async () => {
    vi.mocked(User.findOne).mockReturnValueOnce({
      select: vi.fn().mockResolvedValueOnce(null),
    } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    try {
      await authService.login('nonexistent@test.com', 'anypassword');
      expect.unreachable('Expected error to be thrown');
    } catch (err: unknown) {
      const appErr = err as { code?: string; message?: string };
      expect(appErr.code).toBe('INVALID_CREDENTIALS');
    }
    expect(bcrypt.compare).toHaveBeenCalledWith('anypassword', expect.any(String));
  });

  it('rejects deactivated account', async () => {
    vi.mocked(User.findOne).mockReturnValueOnce({
      select: vi.fn().mockResolvedValueOnce({
        _id: 'user-id',
        email: 'test@test.com',
        passwordHash: 'hash',
        isActive: false,
      }),
    } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    try {
      await authService.login('test@test.com', 'StrongPass1');
      expect.unreachable('Expected error to be thrown');
    } catch (err: unknown) {
      const appErr = err as { code?: string; message?: string };
      expect(appErr.code).toBe('ACCOUNT_DEACTIVATED');
    }
  });

  it('succeeds for valid credentials', async () => {
    const saveMock = vi.fn();
    const userDoc = {
      _id: { toString: () => 'user-id' },
      name: 'Test',
      email: 'test@test.com',
      passwordHash: 'hash',
      role: 'employee',
      permissions: [],
      isActive: true,
      save: saveMock,
    };
    vi.mocked(User.findOne).mockReturnValueOnce({
      select: vi.fn().mockResolvedValueOnce(userDoc),
    } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const { signAccessToken, signRefreshToken } = await import('../src/lib/jwt');
    vi.mocked(signAccessToken).mockReturnValue('access-token' as never);
    vi.mocked(signRefreshToken).mockReturnValue('refresh-token' as never);

    const result = await authService.login('test@test.com', 'StrongPass1');

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result.user).toHaveProperty('role', 'employee');
  });
});
