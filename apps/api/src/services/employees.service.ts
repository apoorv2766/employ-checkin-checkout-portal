import bcrypt from 'bcrypt';
import { User, Shift, AuditLog } from '../models';
import { AppError, ErrorCode } from '../utils/AppError';
import redis, { loginLockKey } from '../lib/redis';
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  UpdateOwnProfileInput,
  AttendanceFilterInput,
} from '@attendance-portal/shared';
import type { Types } from 'mongoose';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let empCounter = 0;

/** Generates an auto-incrementing human-readable ID like "EMP-0042". */
async function generateEmployeeId(): Promise<string> {
  const last = await User.findOne().sort({ createdAt: -1 }).select('employeeId');
  if (last?.employeeId) {
    const num = parseInt(last.employeeId.replace('EMP-', ''), 10);
    if (!isNaN(num)) empCounter = num;
  }
  empCounter += 1;
  return `EMP-${String(empCounter).padStart(4, '0')}`;
}

/** Generates a random temporary password. */
function generateTempPassword(): string {
  return Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-6) + 'A1!';
}

// ─── List employees ───────────────────────────────────────────────────────────

export interface ListEmployeeQuery {
  page: number;
  limit: number;
  department?: string;
  role?: string;
  search?: string;
  isActive?: boolean;
}

export async function listEmployees(query: ListEmployeeQuery) {
  const filter: Record<string, unknown> = {};
  if (query.department) filter['department'] = query.department;
  if (query.role) filter['role'] = query.role;
  if (query.isActive !== undefined) filter['isActive'] = query.isActive;
  if (query.search) {
    filter['$or'] = [
      { firstName: { $regex: query.search, $options: 'i' } },
      { lastName: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } },
      { employeeId: { $regex: query.search, $options: 'i' } },
    ];
  }

  const skip = (query.page - 1) * query.limit;
  const [employees, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash')
      .populate('shift', 'name startTime endTime')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit),
    User.countDocuments(filter),
  ]);

  // Batch-check Redis lock keys in a single MGET call
  let enriched: (Record<string, unknown> & { isLocked: boolean })[];
  if (employees.length === 0) {
    enriched = [];
  } else {
    const lockKeys = employees.map((e) => loginLockKey(e.email));
    const lockValues = await redis.mget(...lockKeys);
    enriched = employees.map((e, i) => ({
      ...(e.toObject() as unknown as Record<string, unknown>),
      isLocked: lockValues[i] !== null && Number(lockValues[i]) >= 5,
    }));
  }

  return { employees: enriched, total };
}

// ─── Get single employee ──────────────────────────────────────────────────────

export async function getEmployee(id: string) {
  const employee = await User.findById(id)
    .select('-passwordHash')
    .populate('shift', 'name startTime endTime timezone workingDays');

  if (!employee) {
    throw new AppError(ErrorCode.NOT_FOUND, 404, 'Employee not found');
  }
  return employee;
}

// ─── Create employee ──────────────────────────────────────────────────────────

export async function createEmployee(
  data: CreateEmployeeInput,
  performedBy: Types.ObjectId,
  ipAddress: string,
) {
  // Validate shift exists
  const shift = await Shift.findById(data.shift);
  if (!shift || !shift.isActive) {
    throw new AppError(ErrorCode.NOT_FOUND, 404, 'Shift not found or inactive');
  }

  const existing = await User.findOne({ email: data.email.toLowerCase().trim() });
  if (existing) {
    throw new AppError(ErrorCode.CONFLICT, 409, 'Email is already registered');
  }

  const chosenPassword = data.password ?? generateTempPassword();
  const passwordHash = await bcrypt.hash(chosenPassword, 12);
  const employeeId = await generateEmployeeId();

  // Strip password from the stored document (password field is for creation only)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _pw, ...employeeData } = data;

  const employee = await User.create({
    ...employeeData,
    email: data.email.toLowerCase().trim(),
    employeeId,
    passwordHash,
    isActive: true,
  });

  if (!data.password) {
    // Only log when we generated a temp password (admin didn't set one)
    console.log(
      `[employees] New employee ${employee.email} created. Temp password: ${chosenPassword}`,
    );
  }

  await AuditLog.create({
    action: 'employee.create',
    performedBy,
    targetResource: 'User',
    targetId: employee._id,
    before: {},
    after: { employeeId, email: employee.email, role: employee.role },
    ipAddress,
    timestamp: new Date(),
  });

  return employee;
}

// ─── Update employee (admin) ──────────────────────────────────────────────────

export async function updateEmployee(
  id: string,
  data: UpdateEmployeeInput,
  performedBy: Types.ObjectId,
  ipAddress: string,
) {
  const employee = await User.findById(id).select('-passwordHash');
  if (!employee) {
    throw new AppError(ErrorCode.NOT_FOUND, 404, 'Employee not found');
  }

  if (data.shift) {
    const shift = await Shift.findById(data.shift);
    if (!shift || !shift.isActive) {
      throw new AppError(ErrorCode.NOT_FOUND, 404, 'Shift not found or inactive');
    }
  }

  if (data.email) {
    const normalised = data.email.toLowerCase().trim();
    const conflict = await User.findOne({ email: normalised, _id: { $ne: employee._id } });
    if (conflict) {
      throw new AppError(ErrorCode.CONFLICT, 409, 'Email is already in use by another employee');
    }
  }

  const before = employee.toObject();
  Object.assign(employee, {
    ...data,
    ...(data.email ? { email: data.email.toLowerCase().trim() } : {}),
  });
  await employee.save();

  const after = employee.toObject();

  await AuditLog.create({
    action: 'employee.update',
    performedBy,
    targetResource: 'User',
    targetId: employee._id,
    before,
    after,
    ipAddress,
    timestamp: new Date(),
  });

  return employee;
}

// ─── Soft-delete employee ─────────────────────────────────────────────────────

export async function deactivateEmployee(
  id: string,
  performedBy: Types.ObjectId,
  ipAddress: string,
) {
  const employee = await User.findById(id).select('-passwordHash');
  if (!employee) {
    throw new AppError(ErrorCode.NOT_FOUND, 404, 'Employee not found');
  }
  if (!employee.isActive) {
    throw new AppError(ErrorCode.CONFLICT, 409, 'Employee is already inactive');
  }

  employee.isActive = false;
  await employee.save();

  await AuditLog.create({
    action: 'employee.deactivate',
    performedBy,
    targetResource: 'User',
    targetId: employee._id,
    before: { isActive: true },
    after: { isActive: false },
    ipAddress,
    timestamp: new Date(),
  });
}

// ─── Employee updates own profile ─────────────────────────────────────────────

export async function updateOwnProfile(
  userId: string,
  data: UpdateOwnProfileInput,
) {
  const employee = await User.findById(userId).select('-passwordHash');
  if (!employee) {
    throw new AppError(ErrorCode.NOT_FOUND, 404, 'User not found');
  }

  // Only allow a subset of fields to be self-updated
  if (data.phone !== undefined) employee.phone = data.phone;
  if (data.profilePhoto !== undefined) employee.profilePhoto = data.profilePhoto;
  if (data.timezone !== undefined) employee.timezone = data.timezone;

  await employee.save();
  return employee;
}

// ─── Query param shape for list endpoint ──────────────────────────────────────

export type { AttendanceFilterInput };
