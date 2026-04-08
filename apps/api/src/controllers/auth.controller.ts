import type { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { sendSuccess, sendError } from '../utils/response';
import { AppError, ErrorCode } from '../utils/AppError';

const REFRESH_COOKIE = 'refreshToken';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const isProd = process.env['NODE_ENV'] === 'production';

function setRefreshCookie(res: Response, token: string, remember = true): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    // Omit maxAge when not remembering → becomes a session cookie
    ...(remember ? { maxAge: SEVEN_DAYS_MS } : {}),
    path: '/',
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
}

// ─── POST /auth/login ─────────────────────────────────────────────────────────

export async function loginHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, password, rememberMe } = req.body as { email: string; password: string; rememberMe?: boolean };
    const { tokens, user } = await authService.login(email, password);

    setRefreshCookie(res, tokens.refreshToken, rememberMe !== false);

    sendSuccess(
      res,
      { accessToken: tokens.accessToken, user },
      200,
      'Login successful',
    );
  } catch (err) {
    next(err);
  }
}

// ─── POST /auth/logout ────────────────────────────────────────────────────────

export async function logoutHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const refreshToken = req.cookies[REFRESH_COOKIE] as string | undefined;
    if (refreshToken) {
      try {
        const { verifyRefreshToken } = await import('../lib/jwt');
        const payload = verifyRefreshToken(refreshToken);
        await authService.logout(payload.sub, payload.jti);
      } catch {
        // Token already invalid — still clear the cookie
      }
    }
    clearRefreshCookie(res);
    sendSuccess(res, null, 200, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
}

// ─── POST /auth/refresh ───────────────────────────────────────────────────────

export async function refreshHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const refreshToken = req.cookies[REFRESH_COOKIE] as string | undefined;
    if (!refreshToken) {
      sendError(res, ErrorCode.TOKEN_INVALID, 'Refresh token cookie is missing', 401);
      return;
    }

    const tokens = await authService.refresh(refreshToken);
    setRefreshCookie(res, tokens.refreshToken);

    sendSuccess(res, { accessToken: tokens.accessToken }, 200);
  } catch (err) {
    clearRefreshCookie(res);
    next(err);
  }
}

// ─── POST /auth/change-password ───────────────────────────────────────────────

export async function changePasswordHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, ErrorCode.UNAUTHORIZED, 'Unauthenticated', 401);
      return;
    }
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };
    await authService.changePassword(req.user._id.toString(), currentPassword, newPassword);
    clearRefreshCookie(res);
    sendSuccess(res, null, 200, 'Password changed. Please log in again.');
  } catch (err) {
    next(err);
  }
}

// ─── POST /auth/forgot-password ───────────────────────────────────────────────

export async function forgotPasswordHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email } = req.body as { email: string };
    await authService.forgotPassword(email);
    // Always return 200 — do not reveal whether email exists
    sendSuccess(
      res,
      null,
      200,
      'If that email is registered, a reset link has been sent.',
    );
  } catch (err) {
    next(err);
  }
}

// ─── POST /auth/reset-password ────────────────────────────────────────────────

export async function resetPasswordHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { token, newPassword } = req.body as { token: string; newPassword: string };
    await authService.resetPassword(token, newPassword);
    sendSuccess(res, null, 200, 'Password reset successfully. Please log in.');
  } catch (err) {
    next(err);
  }
}

// ─── Global error handler for AppError (attached in routes or index.ts) ───────

export function appErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    sendError(res, err.code, err.message, err.statusCode);
    return;
  }
  console.error('[api] Unhandled error:', err);
  sendError(res, ErrorCode.INTERNAL_ERROR, 'An unexpected error occurred', 500);
}
