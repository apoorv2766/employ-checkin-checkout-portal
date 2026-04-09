import { Schema, model, models, type Model } from 'mongoose';
import type { ILeaveRequest } from '@attendance-portal/shared';

const leaveRequestSchema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['sick', 'casual', 'earned', 'unpaid'],
      required: true,
    },
    startDate: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v),
        message: 'startDate must be in YYYY-MM-DD format',
      },
    },
    endDate: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v),
        message: 'endDate must be in YYYY-MM-DD format',
      },
    },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      required: true,
      default: 'pending',
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewNote: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Employee's leave history (newest first)
leaveRequestSchema.index({ employee: 1, createdAt: -1 });

// Admin/manager pending review queue
leaveRequestSchema.index({ status: 1 });

// ─── Model ────────────────────────────────────────────────────────────────────

const LeaveRequest = (
  models['LeaveRequest'] ?? model('LeaveRequest', leaveRequestSchema)
) as Model<ILeaveRequest>;

export default LeaveRequest;
