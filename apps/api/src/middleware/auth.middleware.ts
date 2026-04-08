import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { verifyAccessToken } from '../lib/jwt';
import { sendError } from '../utils/response';
import { AppError, ErrorCode } from '../utils/AppError';
import type { UserRole } from '@attendance-portal/shared';

/**
 * Verifies the JWT access token from the Authorization header.
 * Attaches `req.user` on success. Sends 401 on failure.
 */
export function authenticateJWT(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    sendError(res, ErrorCode.UNAUTHORIZED, 'Authorization header missing or malformed', 401);
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      _id: new mongoose.Types.ObjectId(payload.sub),
      role: payload.role,
      email: payload.email,
    };
    next();
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.code, err.message, err.statusCode);
    } else {
      sendError(res, ErrorCode.TOKEN_INVALID, 'Access token is invalid', 401);
    }
  }
}

/**
 * Role-based access guard. Must be used AFTER `authenticateJWT`.
 * Pass the roles that are allowed to access the route.
 */
export function requireRole(allowed: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, ErrorCode.UNAUTHORIZED, 'Unauthenticated', 401);
      return;
    }
    if (!allowed.includes(req.user.role)) {
      sendError(
        res,
        ErrorCode.FORBIDDEN,
        `Requires one of roles: ${allowed.join(', ')}`,
        403,
      );
      return;
    }
    next();
  };
}
