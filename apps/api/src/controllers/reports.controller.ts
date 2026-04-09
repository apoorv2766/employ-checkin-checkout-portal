import type { Request, Response, NextFunction } from 'express';
import * as reportsService from '../services/reports.service';
import { sendSuccess, sendError } from '../utils/response';
import { ErrorCode } from '../utils/AppError';

// ─── GET /reports/monthly ─────────────────────────────────────────────────────

export async function monthlyReportHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const q = req.query as Record<string, string>;
    const month = q['month'] ?? new Date().toISOString().slice(0, 7);

    if (!/^\d{4}-\d{2}$/.test(month)) {
      sendError(res, ErrorCode.VALIDATION_ERROR, 'month must be in YYYY-MM format', 422);
      return;
    }

    const data = await reportsService.getMonthlyReport(
      month,
      q['department'],
      q['employeeId'],
    );
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

// ─── GET /reports/department ──────────────────────────────────────────────────

export async function departmentReportHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const q = req.query as Record<string, string>;

    // Default: current month
    const now = new Date();
    const year = now.getUTCFullYear();
    const mo = String(now.getUTCMonth() + 1).padStart(2, '0');
    const lastDay = new Date(year, now.getUTCMonth() + 1, 0).getDate();

    const from = q['from'] ?? `${year}-${mo}-01`;
    const to = q['to'] ?? `${year}-${mo}-${String(lastDay).padStart(2, '0')}`;

    const data = await reportsService.getDepartmentReport(from, to);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

// ─── GET /reports/export ──────────────────────────────────────────────────────

export async function exportCsvHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const q = req.query as Record<string, string>;

    // Default: current month
    const now = new Date();
    const year = now.getUTCFullYear();
    const mo = String(now.getUTCMonth() + 1).padStart(2, '0');
    const lastDay = new Date(year, now.getUTCMonth() + 1, 0).getDate();

    const from = q['from'] ?? `${year}-${mo}-01`;
    const to = q['to'] ?? `${year}-${mo}-${String(lastDay).padStart(2, '0')}`;

    const csv = await reportsService.generateCsvExport(from, to, q['department']);

    const filename = `attendance-${from}-to-${to}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // Prevent intermediary caching of potentially sensitive export data
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
}
