import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { parse, parseISO, differenceInMinutes, differenceInSeconds } from 'date-fns';
import redis, { checkInKey } from '../lib/redis';
import { AttendanceRecord, User, AuditLog } from '../models';
import { AppError, ErrorCode } from '../utils/AppError';
import type { CheckInInput, CheckOutInput, AttendanceFilterInput } from '@attendance-portal/shared';
import type { Types } from 'mongoose';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format a UTC Date into "YYYY-MM-DD" in a given IANA timezone. */
function toLocalDate(utcDate: Date, timezone: string): string {
  return formatInTimeZone(utcDate, timezone, 'yyyy-MM-dd');
}

/**
 * Parse "HH:MM" time string into a Date on the same calendar day as `referenceDate`
 * in the given timezone, returning a UTC Date.
 * Uses date-fns-tz v3 API with toZonedTime/fromZonedTime.
 */
function shiftTimeOnDate(timeStr: string, referenceDate: Date, timezone: string): Date {
  // Get the reference date as a zoned time
  const zonedDate = toZonedTime(referenceDate, timezone);
  
  // Extract hours and minutes from the time string
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  // Create a new date with the shift time, keeping the same year/month/day in the target timezone
  const shiftZoned = new Date(zonedDate);
  shiftZoned.setHours(hours, minutes, 0, 0);
  
  // Convert back to UTC
  return fromZonedTime(shiftZoned, timezone);
}

/**
 * Returns true if `time` is within the shift window (± grace) expressed in UTC.
 * Handles overnight shifts (endTime < startTime).
*/
function isWithinShiftHours(
  time: Date,
  startTime: string,
  endTime: string,
  gracePeriodMinutes: number,
  timezone: string,
): { inWindow: boolean; lateByMinutes: number } {
  const shiftStart = shiftTimeOnDate(startTime, time, timezone);
  let shiftEnd = shiftTimeOnDate(endTime, time, timezone);

  // Overnight shift: end rolls into next calendar day
  if (shiftEnd <= shiftStart) {
    shiftEnd = new Date(shiftEnd.getTime() + 24 * 60 * 60 * 1000);
  }

  const earliestCheckIn = new Date(shiftStart.getTime() - 60 * 60 * 1000); // 1 hour before
  const latestCheckIn = new Date(shiftEnd.getTime()); // can't check in after shift ends

  const inWindow = time >= earliestCheckIn && time <= latestCheckIn;
  const lateByMinutes = Math.max(
    0,
    differenceInMinutes(time, new Date(shiftStart.getTime() + gracePeriodMinutes * 60 * 1000)),
  );

  return { inWindow, lateByMinutes };
}

// ─── Check-in ─────────────────────────────────────────────────────────────────

export async function checkIn(
  userId: string,
  input: CheckInInput,
  ipAddress: string,
  deviceInfo?: string,
) {
  // 1. Load user + shift
  const user = await User.findById(userId).populate<{
    shift: {
      startTime: string;
      endTime: string;
      gracePeriodMinutes: number;
      timezone: string;
      workingDays: number[];
      isActive: boolean;
    };
  }>('shift');

  if (!user || !user.isActive) {
    throw new AppError(ErrorCode.INACTIVE_EMPLOYEE, 403, 'Account is deactivated');
  }

  const now = new Date(); // Always use server time
  const userTimezone = user.timezone;
  const localDate = toLocalDate(now, userTimezone);

  // 2. Redis idempotency guard (fast path)
  const idempotencyKey = checkInKey(userId, localDate);
  const existing = await redis.get(idempotencyKey);
  if (existing) {
    throw new AppError(ErrorCode.ALREADY_CHECKED_IN, 409, 'Already checked in today');
  }

  // 3. Shift-hours guard
  const shift = user.shift as typeof user.shift & {
    startTime: string;
    endTime: string;
    gracePeriodMinutes: number;
    timezone: string;
    workingDays: number[];
    isActive: boolean;
  };

  const shiftTimezone = shift.timezone ?? userTimezone;
  const { inWindow, lateByMinutes } = isWithinShiftHours(
    now,
    shift.startTime,
    shift.endTime,
    shift.gracePeriodMinutes,
    shiftTimezone,
  );

  if (!inWindow && !input.force) {
    throw new AppError(
      ErrorCode.OUTSIDE_SHIFT_HOURS,
      422,
      'Check-in is outside your shift hours. Use force: true to override (managers only).',
    );
  }

  const isLate = lateByMinutes > 0;
  const status = isLate ? 'late' : 'present';

  // 4. Create MongoDB record (unique index is final guard against race conditions)
  let record;
  try {
    record = await AttendanceRecord.create({
      employee: userId,
      date: localDate,
      checkIn: {
        time: now,
        location: input.location,
        ipAddress,
        deviceInfo,
        method: input.method ?? 'web',
      },
      status,
      isLate,
      lateByMinutes: isLate ? lateByMinutes : undefined,
      isManuallyEdited: false,
    });
  } catch (err: unknown) {
    // MongoDB duplicate key on { employee, date } compound unique index
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: number }).code === 11000
    ) {
      throw new AppError(ErrorCode.ALREADY_CHECKED_IN, 409, 'Already checked in today');
    }
    throw err;
  }

  // 5. Set Redis idempotency key (TTL until end of day in UTC)
  const secondsUntilMidnight =
    86400 - differenceInSeconds(now, new Date(now.toISOString().slice(0, 10) + 'T00:00:00Z'));
  await redis.set(idempotencyKey, record._id.toString(), 'EX', Math.max(60, secondsUntilMidnight));

  return record;
}

// ─── Check-out ────────────────────────────────────────────────────────────────

export async function checkOut(
  userId: string,
  input: CheckOutInput,
  ipAddress: string,
  deviceInfo?: string,
) {
  const now = new Date();
  const user = await User.findById(userId).select('timezone isActive');

  if (!user || !user.isActive) {
    throw new AppError(ErrorCode.INACTIVE_EMPLOYEE, 403, 'Account is deactivated');
  }

  const localDate = toLocalDate(now, user.timezone);

  const record = await AttendanceRecord.findOne({ employee: userId, date: localDate });
  if (!record) {
    throw new AppError(ErrorCode.NOT_CHECKED_IN, 422, 'No check-in found for today');
  }
  if (record.checkOut) {
    throw new AppError(ErrorCode.CONFLICT, 409, 'Already checked out today');
  }

  // Compute totalHours and persist — never recompute on read
  const totalHours =
    Math.round(
      (differenceInSeconds(now, record.checkIn.time) / 3600) * 100,
    ) / 100;

  record.checkOut = {
    time: now,
    location: input.location,
    ipAddress,
    deviceInfo,
    method: input.method ?? 'web',
  };
  record.totalHours = totalHours;

  // Upgrade status from 'present'/'late' based on hours
  if (totalHours < 4) {
    record.status = 'half-day';
  }

  await record.save();
  return record;
}

// ─── Today's record ───────────────────────────────────────────────────────────

export async function getTodayRecord(userId: string) {
  const user = await User.findById(userId).select('timezone');
  if (!user) throw new AppError(ErrorCode.NOT_FOUND, 404, 'User not found');

  const localDate = toLocalDate(new Date(), user.timezone);
  return AttendanceRecord.findOne({ employee: userId, date: localDate });
}

// ─── Personal history (paginated) ─────────────────────────────────────────────

export async function getPersonalHistory(
  userId: string,
  query: Pick<AttendanceFilterInput, 'page' | 'limit' | 'from' | 'to' | 'status'>,
) {
  const filter: Record<string, unknown> = { employee: userId };
  if (query.from ?? query.to) {
    const dateFilter: Record<string, string> = {};
    if (query.from) dateFilter['$gte'] = query.from;
    if (query.to) dateFilter['$lte'] = query.to;
    filter['date'] = dateFilter;
  }
  if (query.status) filter['status'] = query.status;

  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    AttendanceRecord.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AttendanceRecord.countDocuments(filter),
  ]);

  return { records, total };
}

// ─── All records (admin / manager) ────────────────────────────────────────────

export async function getAllRecords(query: AttendanceFilterInput) {
  const filter: Record<string, unknown> = {};

  if (query.date) {
    filter['date'] = query.date;
  } else if (query.from ?? query.to) {
    const dateFilter: Record<string, string> = {};
    if (query.from) dateFilter['$gte'] = query.from;
    if (query.to) dateFilter['$lte'] = query.to;
    filter['date'] = dateFilter;
  }

  if (query.status) filter['status'] = query.status;

  // Filter by department: join through User
  if (query.department) {
    const userIds = await User.find({ department: query.department }).distinct('_id');
    filter['employee'] = { $in: userIds };
  } else if (query.employeeId) {
    const user = await User.findOne({ employeeId: query.employeeId }).select('_id');
    if (user) {
      filter['employee'] = user._id;
    } else {
      return { records: [], total: 0 };
    }
  }

  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    AttendanceRecord.find(filter)
      .populate('employee', 'employeeId firstName lastName email department timezone')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AttendanceRecord.countDocuments(filter),
  ]);

  return { records, total };
}

// ─── Get single record ────────────────────────────────────────────────────────

export async function getRecord(id: string) {
  const record = await AttendanceRecord.findById(id).populate(
    'employee',
    'employeeId firstName lastName email department timezone',
  );
  if (!record) throw new AppError(ErrorCode.NOT_FOUND, 404, 'Attendance record not found');
  return record;
}

// ─── Manual correction (admin only) ──────────────────────────────────────────

export async function correctRecord(
  id: string,
  data: { checkIn?: string; checkOut?: string; reason: string },
  performedBy: Types.ObjectId,
  ipAddress: string,
) {
  const record = await AttendanceRecord.findById(id);
  if (!record) throw new AppError(ErrorCode.NOT_FOUND, 404, 'Attendance record not found');

  const before = record.toObject();

  if (data.checkIn) {
    record.checkIn.time = parseISO(data.checkIn);
  }
  if (data.checkOut) {
    if (!record.checkOut) {
      record.checkOut = {
        time: parseISO(data.checkOut),
        method: 'web',
      };
    } else {
      record.checkOut.time = parseISO(data.checkOut);
    }
  }

  // Recompute totalHours after manual edit
  if (record.checkOut) {
    record.totalHours =
      Math.round(
        (differenceInSeconds(record.checkOut.time, record.checkIn.time) / 3600) * 100,
      ) / 100;
  }

  record.isManuallyEdited = true;
  record.editReason = data.reason;
  record.editedBy = performedBy;

  await record.save();

  const after = record.toObject();

  // AuditLog is append-only — always create, never update
  await AuditLog.create({
    action: 'attendance.manual_edit',
    performedBy,
    targetResource: 'AttendanceRecord',
    targetId: record._id,
    before,
    after,
    ipAddress,
    timestamp: new Date(),
  });

  return record;
}

// ─── Monthly summary for a single employee ────────────────────────────────────

export async function getMonthlySummary(employeeId: string, month: string) {
  const user = await User.findById(employeeId).select('_id');
  if (!user) throw new AppError(ErrorCode.NOT_FOUND, 404, 'Employee not found');

  const [year, mo] = month.split('-').map(Number) as [number, number];
  const from = `${month}-01`;
  const lastDay = new Date(year, mo, 0).getDate();
  const to = `${month}-${String(lastDay).padStart(2, '0')}`;

  const records = await AttendanceRecord.find({
    employee: user._id,
    date: { $gte: from, $lte: to },
  }).sort({ date: 1 });

  const summary = {
    employeeId,
    month,
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    onLeave: 0,
    totalHours: 0,
    records,
  };

  for (const r of records) {
    if (r.status === 'present') summary.present += 1;
    else if (r.status === 'absent') summary.absent += 1;
    else if (r.status === 'late') summary.late += 1;
    else if (r.status === 'half-day') summary.halfDay += 1;
    else if (r.status === 'on-leave') summary.onLeave += 1;
    summary.totalHours += r.totalHours ?? 0;
  }

  summary.totalHours = Math.round(summary.totalHours * 100) / 100;
  return summary;
}
