import bcrypt from 'bcrypt';
import crypto from 'crypto';
import User, { IUser } from '../../models/User';
import PasswordResetToken from '../../models/PasswordResetToken';
import ActivityLog from '../../models/ActivityLog';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../lib/jwt';
import { createError } from '../../middleware/errorHandler';
import { env } from '../../config/env';
import { sendPasswordResetEmail } from '../../lib/email';
import { withTransaction } from '../../lib/transaction';

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
      throw createError(401, 'UNAUTHORIZED', 'Account is deactivated');
    }

    const accessToken = signAccessToken(user._id.toString(), user.role, user.permissions);
    const newRefreshToken = signRefreshToken(user._id.toString());

    return { accessToken, refreshToken: newRefreshToken };
  } catch {
    throw createError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token');
  }
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await User.findOne({ email, isActive: true });

  if (!user) {
    return;
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  await PasswordResetToken.create({
    userId: user._id,
    tokenHash,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    used: false,
  });

  const resetLink = `${env.FRONTEND_URL}/reset-password?token=${rawToken}`;

  await sendPasswordResetEmail(email, resetLink);

  ActivityLog.create({
    actor: user._id,
    module: 'auth',
    action: 'password.reset_requested',
    description: `Password reset requested for "${email}"`,
  }).catch((err) => {
    console.error('[activityLog] Failed to write password reset request log:', err);
  });
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<void> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await withTransaction(async (session) => {
    const resetTokenDoc = await PasswordResetToken.findOne({
      tokenHash,
      used: false,
      expiresAt: { $gt: new Date() },
    }).session(session);

    if (!resetTokenDoc) {
      throw createError(
        400,
        'INVALID_OR_EXPIRED_TOKEN',
        'Invalid or expired reset link'
      );
    }

    const user = await User.findById(resetTokenDoc.userId).select('+passwordHash').session(session);

    if (!user) {
      return;
    }

    user.passwordHash = passwordHash;
    await user.save({ session });

    resetTokenDoc.used = true;
    await resetTokenDoc.save({ session });

    ActivityLog.create({
      actor: user._id,
      module: 'auth',
      action: 'password.reset',
      description: `Password reset completed for user "${user.email}"`,
    }).catch((err) => {
      console.error('[activityLog] Failed to write password reset log:', err);
    });
  });
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
