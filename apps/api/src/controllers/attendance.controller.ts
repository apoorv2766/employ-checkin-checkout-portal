import type { Request, Response, NextFunction } from 'express';
import * as attendanceService from '../services/attendance.service';
import { sendSuccess, sendError } from '../utils/response';
import { ErrorCode } from '../utils/AppError';
import type { CheckInInput, CheckOutInput, AttendanceCorrectionInput } from '@attendance-portal/shared';

function getDeviceInfo(req: Request): string | undefined {
  return req.headers['user-agent'] ?? undefined;
}

// ─── POST /attendance/check-in ────────────────────────────────────────────────

export async function checkInHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, ErrorCode.UNAUTHORIZED, 'Unauthenticated', 401);
      return;
    }
    // `force: true` is only honoured for managers — strip it for employees
    const input = req.body as CheckInInput;
    if (input.force && req.user.role === 'employee') {
      input.force = false;
    }

    const record = await attendanceService.checkIn(
      req.user._id.toString(),
      input,
      req.ip ?? 'unknown',
      getDeviceInfo(req),
    );
    sendSuccess(res, record, 201, 'Checked in successfully');
  } catch (err) {
    next(err);
  }
}

// ─── POST /attendance/check-out ───────────────────────────────────────────────

export async function checkOutHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, ErrorCode.UNAUTHORIZED, 'Unauthenticated', 401);
      return;
    }
    const record = await attendanceService.checkOut(
      req.user._id.toString(),
      req.body as CheckOutInput,
      req.ip ?? 'unknown',
      getDeviceInfo(req),
    );
    sendSuccess(res, record, 200, 'Checked out successfully');
  } catch (err) {
    next(err);
  }
}

// ─── GET /attendance/today ────────────────────────────────────────────────────

export async function getTodayHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, ErrorCode.UNAUTHORIZED, 'Unauthenticated', 401);
      return;
    }
    const record = await attendanceService.getTodayRecord(req.user._id.toString());
    sendSuccess(res, record ?? null);
  } catch (err) {
    next(err);
  }
}

// ─── GET /attendance/history ──────────────────────────────────────────────────

export async function getHistoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, ErrorCode.UNAUTHORIZED, 'Unauthenticated', 401);
      return;
    }
    const q = req.query as Record<string, string>;
    const page = parseInt(q['page'] ?? '1', 10);
    const limit = parseInt(q['limit'] ?? '20', 10);
    const { records, total } = await attendanceService.getPersonalHistory(
      req.user._id.toString(),
      {
        page,
        limit,
        from: q['from'],
        to: q['to'],
        status: q['status'] as never,
      },
    );
    sendSuccess(res, records, 200, undefined, { page, limit, total });
  } catch (err) {
    next(err);
  }
}

// ─── GET /attendance/ (admin / manager) ───────────────────────────────────────

export async function getAllRecordsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const q = req.query as Record<string, string>;
    const page = parseInt(q['page'] ?? '1', 10);
    const limit = parseInt(q['limit'] ?? '20', 10);
    const { records, total } = await attendanceService.getAllRecords({
      page,
      limit,
      date: q['date'],
      from: q['from'],
      to: q['to'],
      department: q['department'],
      status: q['status'] as never,
      employeeId: q['employeeId'],
    });
    sendSuccess(res, records, 200, undefined, { page, limit, total });
  } catch (err) {
    next(err);
  }
}

// ─── GET /attendance/:id (admin / manager) ────────────────────────────────────

export async function getRecordHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const record = await attendanceService.getRecord(req.params['id'] as string);
    sendSuccess(res, record);
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /attendance/:id (admin only — manual correction) ───────────────────

export async function correctRecordHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, ErrorCode.UNAUTHORIZED, 'Unauthenticated', 401);
      return;
    }
    const body = req.body as AttendanceCorrectionInput;
    const record = await attendanceService.correctRecord(
      req.params['id'] as string,
      body,
      req.user._id,
      req.ip ?? 'unknown',
    );
    sendSuccess(res, record, 200, 'Attendance record corrected');
  } catch (err) {
    next(err);
  }
}

// ─── GET /attendance/summary/:employeeId (admin / manager) ──────────────────

export async function getSummaryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const q = req.query as Record<string, string>;
    const month = q['month'] ?? new Date().toISOString().slice(0, 7);
    const summary = await attendanceService.getMonthlySummary(
      req.params['employeeId'] as string,
      month,
    );
    sendSuccess(res, summary);
  } catch (err) {
    next(err);
  }
}
