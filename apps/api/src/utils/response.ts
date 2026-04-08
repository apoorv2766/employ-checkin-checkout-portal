import type { Response } from 'express';

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  message?: string,
  pagination?: { page: number; limit: number; total: number },
): void {
  res.status(statusCode).json({
    success: true,
    data,
    ...(message !== undefined ? { message } : {}),
    ...(pagination !== undefined ? { pagination } : {}),
  });
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode: number,
): void {
  res.status(statusCode).json({ success: false, error: { code, message } });
}
