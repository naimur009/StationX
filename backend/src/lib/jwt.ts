import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env';

const accessTokenPayloadSchema = z.object({
  sub: z.string(),
  role: z.string(),
  permissions: z.array(
    z.object({
      module: z.string(),
      actions: z.array(z.string()),
    })
  ),
  iat: z.number().optional(),
  exp: z.number().optional(),
});

const refreshTokenPayloadSchema = z.object({
  sub: z.string(),
  iat: z.number().optional(),
  exp: z.number().optional(),
});

export type AccessTokenPayload = z.infer<typeof accessTokenPayloadSchema>;
export type RefreshTokenPayload = z.infer<typeof refreshTokenPayloadSchema>;

export function signAccessToken(
  userId: string,
  role: string,
  permissions: { module: string; actions: string[] }[]
): string {
  return jwt.sign(
    { sub: userId, role, permissions },
    env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '15m' }
  );
}

export function signRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId },
    env.JWT_REFRESH_SECRET,
    { algorithm: 'HS256', expiresIn: '7d' }
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });
  return accessTokenPayloadSchema.parse(decoded);
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ['HS256'] });
  return refreshTokenPayloadSchema.parse(decoded);
}
