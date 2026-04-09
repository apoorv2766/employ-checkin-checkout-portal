import type { Types } from 'mongoose';

// ─── User ─────────────────────────────────────────────────────────────────────

export type UserRole = 'employee' | 'manager' | 'admin';

export interface IUser {
  _id: Types.ObjectId;
  employeeId: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  department: string;
  designation: string;
  phone?: string;
  timezone: string;
  shift: Types.ObjectId;
  isActive: boolean;
  profilePhoto?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Shift ────────────────────────────────────────────────────────────────────

export interface IShift {
  _id: Types.ObjectId;
  name: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  workingDays: number[];
  timezone: string;
  isActive: boolean;
  createdAt: Date;
}

// ─── AttendanceRecord ─────────────────────────────────────────────────────────

export type AttendanceMethod = 'web' | 'mobile' | 'kiosk';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half-day' | 'on-leave';

export interface ICheckInOut {
  time: Date;
  location?: { lat: number; lng: number };
  ipAddress?: string;
  deviceInfo?: string;
  method: AttendanceMethod;
}

export interface IAttendanceRecord {
  _id: Types.ObjectId;
  employee: Types.ObjectId;
  date: string;
  checkIn: ICheckInOut;
  checkOut?: ICheckInOut;
  status: AttendanceStatus;
  isLate: boolean;
  lateByMinutes?: number;
  totalHours?: number;
  isManuallyEdited: boolean;
  editReason?: string;
  editedBy?: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── LeaveRequest ─────────────────────────────────────────────────────────────

export type LeaveType = 'sick' | 'casual' | 'earned' | 'unpaid';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface ILeaveRequest {
  _id: Types.ObjectId;
  employee: Types.ObjectId;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  reviewNote?: string;
  createdAt: Date;
}

// ─── AuditLog ─────────────────────────────────────────────────────────────────

export interface IAuditLog {
  _id: Types.ObjectId;
  action: string;
  performedBy: Types.ObjectId;
  targetResource: string;
  targetId: Types.ObjectId;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  ipAddress: string;
  timestamp: Date;
}

// ─── API response shapes ───────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
