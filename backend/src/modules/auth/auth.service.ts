import bcrypt from 'bcrypt';
import crypto from 'crypto';
import User from '../../models/User';
import PasswordResetToken from '../../models/PasswordResetToken';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../lib/jwt';
import { createError } from '../../middleware/errorHandler';
import { env } from '../../config/env';
import { sendPasswordResetEmail } from '../../lib/email';

const SALT_ROUNDS = 12;

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

export async function login(
  email: string,
  password: string
): Promise<LoginResult> {
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+passwordHash'
  );

  if (!user) {
    throw createError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);

  if (!isMatch) {
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

  const accessToken = signAccessToken(
    user._id.toString(),
    user.role,
    user.permissions
  );
  const refreshToken = signRefreshToken(user._id.toString());

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    },
  };
}

export async function refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  // NOTE: Old refresh tokens remain valid until natural expiry (7d).
  // A Redis denylist (Phase 2+) is needed for immediate revocation of
  // rotated tokens. See ARCHITECTURE.md §6.6 and DATABASE.md §3.2.
  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.sub);

    if (!user || !user.isActive) {
      throw createError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token');
    }

    const accessToken = signAccessToken(user._id.toString(), user.role, user.permissions);
    const newRefreshToken = signRefreshToken(user._id.toString());

    return { accessToken, refreshToken: newRefreshToken };
  } catch {
    throw createError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token');
  }
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await User.findOne({ email: email.toLowerCase(), isActive: true });

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
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<void> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const resetTokenDoc = await PasswordResetToken.findOne({
    tokenHash,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!resetTokenDoc) {
    throw createError(
      400,
      'INVALID_OR_EXPIRED_TOKEN',
      'Invalid or expired reset link'
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  const user = await User.findById(resetTokenDoc.userId).select('+passwordHash');

  if (!user) {
    throw createError(404, 'NOT_FOUND', 'User not found');
  }

  user.passwordHash = passwordHash;
  await user.save();

  resetTokenDoc.used = true;
  await resetTokenDoc.save();
}

export async function getMe(userId: string) {
  const user = await User.findById(userId).select('-passwordHash');

  if (!user) {
    throw createError(404, 'NOT_FOUND', 'User not found');
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
  };
}
