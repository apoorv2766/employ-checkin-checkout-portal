import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import redis, { refreshKey, refreshKeyPattern, loginLockKey } from '../lib/redis';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt';
import { User } from '../models';
import { AppError, ErrorCode } from '../utils/AppError';

const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const LOGIN_MAX_FAILURES = 5;
const LOGIN_LOCKOUT_SECONDS = 15 * 60; // 15 min
const PASSWORD_RESET_TTL_SECONDS = 60 * 60; // 1 hour

/** Shape returned to the caller for login / refresh operations. */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenId: string;
}

// ─── Helper: build token pair and persist refresh token in Redis ──────────────

async function issueTokens(
  userId: string,
  role: string,
  email: string,
): Promise<AuthTokens> {
  const accessToken = signAccessToken({
    sub: userId,
    role: role as never,
    email,
  });
  const { token: refreshToken, tokenId } = signRefreshToken(userId);

  await redis.set(refreshKey(userId, tokenId), '1', 'EX', REFRESH_TTL_SECONDS);

  return { accessToken, refreshToken, tokenId };
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string,
): Promise<{ tokens: AuthTokens; user: Record<string, unknown> }> {
  const lockKey = loginLockKey(email);

  // Check lockout
  const rawCount = await redis.get(lockKey);
  const failCount = rawCount ? parseInt(rawCount, 10) : 0;
  if (failCount >= LOGIN_MAX_FAILURES) {
    const ttl = await redis.ttl(lockKey);
    throw new AppError(
      ErrorCode.ACCOUNT_LOCKED,
      429,
      `Account locked. Try again in ${Math.ceil(ttl / 60)} minute(s).`,
    );
  }

  // passwordHash is excluded from queries by default (select: false)
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    '+passwordHash',
  );

  const isMatch = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !isMatch) {
    const newCount = await redis.incr(lockKey);
    if (newCount >= LOGIN_MAX_FAILURES) {
      await redis.expire(lockKey, LOGIN_LOCKOUT_SECONDS);
    }
    throw new AppError(
      ErrorCode.INVALID_CREDENTIALS,
      401,
      'Invalid email or password',
    );
  }

  if (!user.isActive) {
    throw new AppError(ErrorCode.ACCOUNT_INACTIVE, 403, 'Account is deactivated');
  }

  // Clear failure counter on successful login
  await redis.del(lockKey);

  const tokens = await issueTokens(
    user._id.toString(),
    user.role,
    user.email,
  );

  const safeUser = {
    _id: user._id,
    employeeId: user.employeeId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    department: user.department,
    designation: user.designation,
    timezone: user.timezone,
  };

  return { tokens, user: safeUser };
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout(userId: string, tokenId: string): Promise<void> {
  await redis.del(refreshKey(userId, tokenId));
}

// ─── Refresh ──────────────────────────────────────────────────────────────────

export async function refresh(
  incomingRefreshToken: string,
): Promise<AuthTokens> {
  // 1. Verify JWT signature
  const payload = verifyRefreshToken(incomingRefreshToken);
  const userId = payload.sub;
  const oldTokenId = payload.jti;

  const oldKey = refreshKey(userId, oldTokenId);
  const exists = await redis.get(oldKey);

  if (!exists) {
    // Key missing but JWT is valid → replay attack detected.
    // Invalidate ALL refresh tokens for this user.
    const allKeys = await redis.keys(refreshKeyPattern(userId));
    if (allKeys.length > 0) {
      await redis.del(...allKeys);
    }
    throw new AppError(
      ErrorCode.TOKEN_INVALID,
      401,
      'Refresh token already used — all sessions revoked',
    );
  }

  // 2. Delete old token (rotation)
  await redis.del(oldKey);

  // 3. Look up user to embed fresh role/email in new access token
  const user = await User.findById(userId).select('role email isActive');
  if (!user || !user.isActive) {
    throw new AppError(ErrorCode.ACCOUNT_INACTIVE, 403, 'Account not found or deactivated');
  }

  // 4. Issue new token pair
  return issueTokens(userId, user.role, user.email);
}

// ─── Change password ──────────────────────────────────────────────────────────

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) {
    throw new AppError(ErrorCode.NOT_FOUND, 404, 'User not found');
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new AppError(ErrorCode.INVALID_CREDENTIALS, 400, 'Current password is incorrect');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();

  // Revoke all refresh tokens for this user
  const allKeys = await redis.keys(refreshKeyPattern(userId));
  if (allKeys.length > 0) {
    await redis.del(...allKeys);
  }
}

// ─── Forgot password (Phase 1: log to console) ────────────────────────────────

export async function forgotPassword(email: string): Promise<void> {
  const user = await User.findOne({ email: email.toLowerCase().trim() });

  // Always resolve (don't reveal whether the email exists)
  if (!user || !user.isActive) return;

  const resetToken = randomBytes(32).toString('hex');
  const resetKey = `pwd:reset:${resetToken}`;
  await redis.set(resetKey, user._id.toString(), 'EX', PASSWORD_RESET_TTL_SECONDS);

  const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:3000';
  // Phase 1: log to console. Phase 2: send email via email service.
  console.log(
    `[auth] Password reset link for ${email}: ${frontendUrl}/reset-password?token=${resetToken}`,
  );
}

// ─── Reset password ───────────────────────────────────────────────────────────

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  const resetKey = `pwd:reset:${token}`;
  const userId = await redis.get(resetKey);
  if (!userId) {
    throw new AppError(ErrorCode.TOKEN_INVALID, 400, 'Reset token is invalid or has expired');
  }

  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw new AppError(ErrorCode.NOT_FOUND, 404, 'User not found');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();

  // Consume the reset token and revoke all sessions
  await redis.del(resetKey);
  const allKeys = await redis.keys(refreshKeyPattern(userId));
  if (allKeys.length > 0) {
    await redis.del(...allKeys);
  }
}
