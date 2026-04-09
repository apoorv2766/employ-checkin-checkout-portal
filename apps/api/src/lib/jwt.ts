import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { AppError, ErrorCode } from '../utils/AppError';
import type { UserRole } from '@attendance-portal/shared';

// ─── Payload shapes ───────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  sub: string;   // userId (ObjectId as string)
  role: UserRole;
  email: string;
}

export interface RefreshTokenPayload {
  sub: string;   // userId
  jti: string;   // tokenId (UUID) — used as Redis key component
}

// ─── Secret accessors (read lazily so dotenv has time to load) ────────────────

function getEnv(key: string, required = true): string {
  const val = process.env[key];
  if (required && !val) throw new Error(`${key} environment variable is not set`);
  return val ?? '';
}

// ─── Sign ─────────────────────────────────────────────────────────────────────

export function signAccessToken(payload: AccessTokenPayload): string {
  // Cast required: exactOptionalPropertyTypes + jwt's SignOptions.expiresIn?: ...
  const opts = { expiresIn: getEnv('JWT_ACCESS_EXPIRES_IN') } as jwt.SignOptions;
  return jwt.sign(payload, getEnv('JWT_ACCESS_SECRET'), opts);
}

export function signRefreshToken(userId: string): { token: string; tokenId: string } {
  const tokenId = randomUUID();
  const opts = { expiresIn: getEnv('JWT_REFRESH_EXPIRES_IN') } as jwt.SignOptions;
  const token = jwt.sign({ sub: userId, jti: tokenId }, getEnv('JWT_REFRESH_SECRET'), opts);
  return { token, tokenId };
}

// ─── Verify ───────────────────────────────────────────────────────────────────

export function verifyAccessToken(token: string): AccessTokenPayload {
  const secret = getEnv('JWT_ACCESS_SECRET');
  const previous = getEnv('JWT_ACCESS_SECRET_PREVIOUS', false);

  try {
    return jwt.verify(token, secret) as AccessTokenPayload;
  } catch (err) {
    if (previous) {
      try {
        return jwt.verify(token, previous) as AccessTokenPayload;
      } catch {
        // fall through to throw below
      }
    }
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError(ErrorCode.TOKEN_EXPIRED, 401, 'Access token has expired');
    }
    throw new AppError(ErrorCode.TOKEN_INVALID, 401, 'Access token is invalid');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const secret = getEnv('JWT_REFRESH_SECRET');
  const previous = getEnv('JWT_REFRESH_SECRET_PREVIOUS', false);

  try {
    return jwt.verify(token, secret) as RefreshTokenPayload;
  } catch (err) {
    if (previous) {
      try {
        return jwt.verify(token, previous) as RefreshTokenPayload;
      } catch {
        // fall through
      }
    }
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError(ErrorCode.TOKEN_EXPIRED, 401, 'Refresh token has expired');
    }
    throw new AppError(ErrorCode.TOKEN_INVALID, 401, 'Refresh token is invalid');
  }
}
