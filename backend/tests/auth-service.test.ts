import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock all dependencies ---

vi.mock('../src/models/User', () => ({
  default: {
    findOne: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('../src/models/PasswordResetToken', () => ({
  default: {
    create: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('../src/lib/jwt', () => ({
  signAccessToken: vi.fn(() => 'mock-access-token'),
  signRefreshToken: vi.fn(() => 'mock-refresh-token'),
  verifyRefreshToken: vi.fn(() => ({ sub: 'user-1' })),
}));

vi.mock('../src/lib/email', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(() => Promise.resolve('hashed-password')),
    compare: vi.fn(),
  },
  hash: vi.fn(() => Promise.resolve('hashed-password')),
  compare: vi.fn(),
}));

import bcrypt from 'bcrypt';
import User from '../src/models/User';
import PasswordResetToken from '../src/models/PasswordResetToken';
import * as jwt from '../src/lib/jwt';
import * as email from '../src/lib/email';
import { login, refresh, forgotPassword, resetPassword, getMe } from '../src/modules/auth/auth.service';

function makeMockUser(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => 'user-1' },
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: 'hashed-existing',
    role: 'admin',
    permissions: [],
    isActive: true,
    lastLoginAt: null,
    save: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

describe('auth service — login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockFindOne(user: any) {
    return { select: vi.fn().mockResolvedValue(user) };
  }

  it('succeeds with correct credentials for an active user', async () => {
    const mockUser = makeMockUser();
    (User.findOne as any).mockImplementation(() => mockFindOne(mockUser));
    (bcrypt.compare as any).mockResolvedValue(true);

    const result = await login('test@example.com', 'correct-password');

    expect(User.findOne).toHaveBeenCalledWith({
      email: 'test@example.com',
    });
    expect(bcrypt.compare).toHaveBeenCalledWith('correct-password', 'hashed-existing');
    expect(result.accessToken).toBe('mock-access-token');
    expect(result.refreshToken).toBe('mock-refresh-token');
    expect(result.user.email).toBe('test@example.com');
    expect(result.user.role).toBe('admin');
  });

  it('throws 401 INVALID_CREDENTIALS when email does not exist', async () => {
    (User.findOne as any).mockImplementation(() => mockFindOne(null));

    await expect(login('unknown@example.com', 'password')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('throws 401 INVALID_CREDENTIALS when password is wrong', async () => {
    const mockUser = makeMockUser();
    (User.findOne as any).mockImplementation(() => mockFindOne(mockUser));
    (bcrypt.compare as any).mockResolvedValue(false);

    await expect(login('test@example.com', 'wrong-password')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('throws 423 ACCOUNT_DEACTIVATED when user is inactive', async () => {
    const mockUser = makeMockUser({ isActive: false });
    (User.findOne as any).mockImplementation(() => mockFindOne(mockUser));
    (bcrypt.compare as any).mockResolvedValue(true);

    await expect(login('test@example.com', 'password')).rejects.toMatchObject({
      statusCode: 423,
      code: 'ACCOUNT_DEACTIVATED',
    });
  });

  it('normalizes email to lowercase before querying', async () => {
    const mockUser = makeMockUser();
    (User.findOne as any).mockImplementation(() => mockFindOne(mockUser));
    (bcrypt.compare as any).mockResolvedValue(true);

    await login('Test@Example.Com', 'password');

    expect(User.findOne).toHaveBeenCalledWith({
      email: 'test@example.com',
    });
  });

  it('selects +passwordHash to include the hash for comparison', async () => {
    const mockUser = makeMockUser();
    const selectFn = vi.fn().mockResolvedValue(mockUser);
    (User.findOne as any).mockImplementation(() => ({ select: selectFn }));
    (bcrypt.compare as any).mockResolvedValue(true);

    await login('test@example.com', 'password');

    expect(selectFn).toHaveBeenCalledWith('+passwordHash');
  });
});

describe('auth service — refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns new tokens when refresh token is valid', async () => {
    const mockUser = makeMockUser();
    (User.findById as any).mockResolvedValue(mockUser);
    (jwt.verifyRefreshToken as any).mockReturnValue({ sub: 'user-1' });

    const result = await refresh('valid-refresh-token');

    expect(result.accessToken).toBe('mock-access-token');
    expect(result.refreshToken).toBe('mock-refresh-token');
  });

  it('throws 401 when user is deactivated', async () => {
    const mockUser = makeMockUser({ isActive: false });
    (User.findById as any).mockResolvedValue(mockUser);

    await expect(refresh('some-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });
  });

  it('throws 401 when user is not found', async () => {
    (User.findById as any).mockResolvedValue(null);

    await expect(refresh('some-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });
  });
});

describe('auth service — forgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a reset token and sends email when user exists', async () => {
    const mockUser = makeMockUser();
    (User.findOne as any).mockResolvedValue(mockUser);
    (PasswordResetToken.create as any).mockResolvedValue({});

    await forgotPassword('test@example.com');

    expect(PasswordResetToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockUser._id,
        used: false,
      })
    );
    expect(email.sendPasswordResetEmail).toHaveBeenCalledWith(
      'test@example.com',
      expect.stringContaining('/reset-password?token=')
    );
  });

  it('silently returns when email does not exist (anti-enumeration)', async () => {
    (User.findOne as any).mockResolvedValue(null);

    await forgotPassword('unknown@example.com');

    expect(PasswordResetToken.create).not.toHaveBeenCalled();
    expect(email.sendPasswordResetEmail).not.toHaveBeenCalled();
  });
});

describe('auth service — resetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockFindById(user: any) {
    return { select: vi.fn().mockResolvedValue(user) };
  }

  it('updates password and marks token used when valid', async () => {
    const mockUser = makeMockUser();
    const mockTokenDoc = {
      userId: mockUser._id,
      used: false,
      save: vi.fn().mockResolvedValue({}),
    };
    (PasswordResetToken.findOne as any).mockResolvedValue(mockTokenDoc);
    (User.findById as any).mockImplementation(() => mockFindById(mockUser));
    (bcrypt.hash as any).mockResolvedValue('new-hashed-password');

    await resetPassword('valid-raw-token', 'NewPassword123');

    expect(mockUser.passwordHash).toBe('new-hashed-password');
    expect(mockUser.save).toHaveBeenCalled();
    expect(mockTokenDoc.used).toBe(true);
    expect(mockTokenDoc.save).toHaveBeenCalled();
  });

  it('throws 400 when token is expired', async () => {
    (PasswordResetToken.findOne as any).mockResolvedValue(null);

    await expect(resetPassword('old-token', 'NewPassword123')).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_OR_EXPIRED_TOKEN',
    });
  });

  it('throws 400 when token is already used', async () => {
    (PasswordResetToken.findOne as any).mockResolvedValue(null);

    await expect(resetPassword('used-token', 'NewPassword123')).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_OR_EXPIRED_TOKEN',
    });
  });
});

describe('auth service — getMe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user data without passwordHash', async () => {
    const mockUser = makeMockUser();
    (User.findById as any).mockResolvedValue(mockUser);

    const result = await getMe('user-1');

    expect(result.email).toBe('test@example.com');
    expect(result.name).toBe('Test User');
    expect((result as any).passwordHash).toBeUndefined();
  });

  it('throws 404 when user not found', async () => {
    (User.findById as any).mockResolvedValue(null);

    await expect(getMe('nonexistent')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });
});
