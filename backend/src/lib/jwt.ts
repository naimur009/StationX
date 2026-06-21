import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AccessTokenPayload {
  sub: string;
  role: string;
  permissions: { module: string; actions: string[] }[];
}

export interface RefreshTokenPayload {
  sub: string;
}

export function signAccessToken(
  userId: string,
  role: string,
  permissions: { module: string; actions: string[] }[]
): string {
  return jwt.sign(
    { sub: userId, role, permissions } satisfies AccessTokenPayload,
    env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );
}

export function signRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId } satisfies RefreshTokenPayload,
    env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}
