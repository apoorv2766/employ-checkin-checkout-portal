import { z } from 'zod';

// ─── Common ────────────────────────────────────────────────────────────────────

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ─── Auth ──────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

// ─── Check-in / Check-out ─────────────────────────────────────────────────────

export const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const checkInSchema = z.object({
  location: locationSchema.optional(),
  method: z.enum(['web', 'mobile', 'kiosk']).default('web'),
  force: z.boolean().optional(),
});

export const checkOutSchema = z.object({
  location: locationSchema.optional(),
  method: z.enum(['web', 'mobile', 'kiosk']).default('web'),
});

// ─── Attendance filter ─────────────────────────────────────────────────────────

export const attendanceFilterSchema = paginationSchema.extend({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  department: z.string().optional(),
  status: z.enum(['present', 'absent', 'late', 'half-day', 'on-leave']).optional(),
  employeeId: z.string().optional(),
});

export const attendanceCorrectionSchema = z.object({
  checkIn: z.string().datetime().optional(),
  checkOut: z.string().datetime().optional(),
  reason: z.string().min(1),
});

// ─── Employee ─────────────────────────────────────────────────────────────────

export const createEmployeeSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  department: z.string().min(1),
  designation: z.string().min(1),
  role: z.enum(['employee', 'manager', 'admin']).default('employee'),
  shift: objectIdSchema,
  timezone: z.string().min(1),
  phone: z.string().optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.omit({ password: true }).partial();

export const updateOwnProfileSchema = z.object({
  phone: z.string().optional(),
  profilePhoto: z.string().min(1).optional(),
  timezone: z.string().optional(),
});

// ─── Leave ────────────────────────────────────────────────────────────────────

export const createLeaveRequestSchema = z.object({
  type: z.enum(['sick', 'casual', 'earned', 'unpaid']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().min(1),
});

export const reviewLeaveSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewNote: z.string().optional(),
});

// ─── Reports ──────────────────────────────────────────────────────────────────

export const monthlyReportSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  department: z.string().optional(),
  employeeId: z.string().optional(),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;
export type CheckOutInput = z.infer<typeof checkOutSchema>;
export type AttendanceFilterInput = z.infer<typeof attendanceFilterSchema>;
export type AttendanceCorrectionInput = z.infer<typeof attendanceCorrectionSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type UpdateOwnProfileInput = z.infer<typeof updateOwnProfileSchema>;
export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
export type MonthlyReportInput = z.infer<typeof monthlyReportSchema>;
