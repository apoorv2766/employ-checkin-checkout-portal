import { Schema, model, models, type Model } from 'mongoose';
import type { IAttendanceRecord } from '@attendance-portal/shared';

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const checkInOutSchema = new Schema(
  {
    time: { type: Date, required: true },
    location: {
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
    },
    ipAddress: { type: String },
    deviceInfo: { type: String },
    method: {
      type: String,
      enum: ['web', 'mobile', 'kiosk'],
      required: true,
    },
  },
  { _id: false },
);

// ─── Main schema ──────────────────────────────────────────────────────────────

const attendanceRecordSchema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // "YYYY-MM-DD" string in the employee's local timezone, set at check-in
    date: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v),
        message: 'date must be in YYYY-MM-DD format',
      },
    },
    checkIn: { type: checkInOutSchema, required: true },
    checkOut: { type: checkInOutSchema },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'half-day', 'on-leave'],
      required: true,
    },
    isLate: { type: Boolean, required: true, default: false },
    lateByMinutes: { type: Number, min: 0 },
    // Stored on check-out — (checkOut.time - checkIn.time) in hours, rounded to 2dp
    totalHours: { type: Number, min: 0 },
    isManuallyEdited: { type: Boolean, required: true, default: false },
    editReason: { type: String },
    editedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
  },
  {
    timestamps: true,
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Compound unique: one record per employee per calendar day (final race-condition guard)
attendanceRecordSchema.index({ employee: 1, date: 1 }, { unique: true });

// Fast date-range queries across all employees (admin dashboard / reports)
attendanceRecordSchema.index({ date: 1 });

// Filter by status
attendanceRecordSchema.index({ status: 1 });

// Paginated personal history, newest first
attendanceRecordSchema.index({ employee: 1, createdAt: -1 });

// ─── Model ────────────────────────────────────────────────────────────────────

const AttendanceRecord = (
  models['AttendanceRecord'] ?? model('AttendanceRecord', attendanceRecordSchema)
) as Model<IAttendanceRecord>;

export default AttendanceRecord;
