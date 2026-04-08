import type { Request, Response, NextFunction } from 'express';
import * as employeesService from '../services/employees.service';
import { sendSuccess, sendError } from '../utils/response';
import { ErrorCode } from '../utils/AppError';
import redis, { loginLockKey } from '../lib/redis';
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  UpdateOwnProfileInput,
} from '@attendance-portal/shared';

// ─── GET /employees ───────────────────────────────────────────────────────────

export async function listEmployeesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as Record<string, string>;
    const { employees, total } = await employeesService.listEmployees({
      page: parseInt(query['page'] ?? '1', 10),
      limit: parseInt(query['limit'] ?? '20', 10),
      department: query['department'],
      role: query['role'],
      search: query['search'],
      isActive:
        query['isActive'] !== undefined
          ? query['isActive'] === 'true' || query['isActive'] === '1'
          : undefined,
    });

    sendSuccess(res, employees, 200, undefined, {
      page: parseInt(query['page'] ?? '1', 10),
      limit: parseInt(query['limit'] ?? '20', 10),
      total,
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /employees/me ────────────────────────────────────────────────────────

export async function getOwnProfileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, ErrorCode.UNAUTHORIZED, 'Unauthenticated', 401);
      return;
    }
    const employee = await employeesService.getEmployee(req.user._id.toString());
    sendSuccess(res, employee);
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /employees/me ──────────────────────────────────────────────────────

export async function updateOwnProfileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, ErrorCode.UNAUTHORIZED, 'Unauthenticated', 401);
      return;
    }
    const updated = await employeesService.updateOwnProfile(
      req.user._id.toString(),
      req.body as UpdateOwnProfileInput,
    );
    sendSuccess(res, updated, 200, 'Profile updated');
  } catch (err) {
    next(err);
  }
}

// ─── GET /employees/:id ───────────────────────────────────────────────────────

export async function getEmployeeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const employee = await employeesService.getEmployee(req.params['id'] as string);
    sendSuccess(res, employee);
  } catch (err) {
    next(err);
  }
}

// ─── POST /employees ──────────────────────────────────────────────────────────

export async function createEmployeeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, ErrorCode.UNAUTHORIZED, 'Unauthenticated', 401);
      return;
    }
    const employee = await employeesService.createEmployee(
      req.body as CreateEmployeeInput,
      req.user._id,
      req.ip ?? 'unknown',
    );
    sendSuccess(res, employee, 201, 'Employee created');
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /employees/:id ─────────────────────────────────────────────────────

export async function updateEmployeeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, ErrorCode.UNAUTHORIZED, 'Unauthenticated', 401);
      return;
    }
    const updated = await employeesService.updateEmployee(
      req.params['id'] as string,
      req.body as UpdateEmployeeInput,
      req.user._id,
      req.ip ?? 'unknown',
    );
    sendSuccess(res, updated, 200, 'Employee updated');
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /employees/:id ────────────────────────────────────────────────────

export async function deactivateEmployeeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, ErrorCode.UNAUTHORIZED, 'Unauthenticated', 401);
      return;
    }
    if (req.params['id'] === req.user._id.toString()) {
      sendError(res, ErrorCode.VALIDATION_ERROR, 'You cannot deactivate your own account', 400);
      return;
    }
    await employeesService.deactivateEmployee(
      req.params['id'] as string,
      req.user._id,
      req.ip ?? 'unknown',
    );
    sendSuccess(res, null, 200, 'Employee deactivated');
  } catch (err) {
    next(err);
  }
}

// ─── POST /employees/:id/unlock ───────────────────────────────────────────────

export async function unlockAccountHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const employee = await employeesService.getEmployee(req.params['id'] as string);
    if (!employee) {
      sendError(res, ErrorCode.NOT_FOUND, 'Employee not found', 404);
      return;
    }
    await redis.del(loginLockKey(employee.email));
    sendSuccess(res, null, 200, 'Account unlocked successfully');
  } catch (err) {
    next(err);
  }
}
