import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { sendError } from '../utils/response';
import { ErrorCode } from '../utils/AppError';

/**
 * Validates `req.body` against a Zod schema.
 * Replaces body with the parsed (coerced + stripped) result so downstream
 * code always receives type-safe, sanitised data.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      sendError(
        res,
        ErrorCode.VALIDATION_ERROR,
        result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        422,
      );
      return;
    }
    req.body = result.data as unknown;
    next();
  };
}

/**
 * Validates query parameters against a Zod schema.
 * Replaces req.query with the parsed result.
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      sendError(
        res,
        ErrorCode.VALIDATION_ERROR,
        result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        422,
      );
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    req.query = result.data as any;
    next();
  };
}
