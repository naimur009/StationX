import bcrypt from 'bcrypt';
import User, { IUser } from '../../models/User';
import ActivityLog from '../../models/ActivityLog';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../lib/jwt';
import { createError } from '../../middleware/errorHandler';
import { env } from '../../config/env';

const SALT_ROUNDS = 12;

const DUMMY_PASSWORD_HASH = bcrypt.hashSync('dummy-timing-attack-mitigation', SALT_ROUNDS);

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    permissions: { module: string; actions: string[] }[];
  };
}

function toUserLogin(user: IUser) {
  return {
    id: user._id.toString(),
    name: user.name ?? '',
    email: user.email,
    role: user.role,
    permissions: user.permissions,
  };
}

export async function login(
  email: string,
  password: string
): Promise<LoginResult> {
  const user = await User.findOne({ email }).select(
    '+passwordHash'
  );

  if (!user) {
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    throw createError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);

  if (!isMatch) {
    ActivityLog.create({
      actor: user._id,
      module: 'auth',
      action: 'login.failed',
      description: `Failed login attempt for "${user.email}"`,
    }).catch((err) => {
      console.error('[activityLog] Failed to write failed login log:', err);
    });
    throw createError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  if (!user.isActive) {
    throw createError(
      423,
      'ACCOUNT_DEACTIVATED',
      'This account has been deactivated'
    );
  }

  user.lastLoginAt = new Date();
  await user.save();

  ActivityLog.create({
    actor: user._id,
    module: 'auth',
    action: 'login',
    description: `User "${user.email}" logged in`,
  }).catch((err) => {
    console.error('[activityLog] Failed to write login log:', err);
  });

  const accessToken = signAccessToken(
    user._id.toString(),
    user.role,
    user.permissions
  );
  const refreshToken = signRefreshToken(user._id.toString());

  return {
    accessToken,
    refreshToken,
    user: toUserLogin(user),
  };
}

export async function refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  // NOTE: Old refresh tokens remain valid until natural expiry (7d).
  // A Redis denylist (Phase 2+) is needed for immediate revocation of
  // rotated tokens. See ARCHITECTURE.md §6.6 and DATABASE.md §3.2.
  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.sub);

    if (!user) {
      throw createError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token');
    }

    if (!user.isActive) {
      throw createError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token');
    }

    const accessToken = signAccessToken(user._id.toString(), user.role, user.permissions);
    const newRefreshToken = signRefreshToken(user._id.toString());

    return { accessToken, refreshToken: newRefreshToken };
  } catch {
    throw createError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token');
  }
}

export async function getMe(userId: string) {
  const user = await User.findById(userId);

  if (!user) {
    throw createError(404, 'NOT_FOUND', 'User not found');
  }

  if (!user.isActive) {
    throw createError(401, 'UNAUTHORIZED', 'Account is deactivated');
  }

  return toUserLogin(user);
}
