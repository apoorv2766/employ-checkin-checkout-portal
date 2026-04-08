import { Schema, model, models, type Model } from 'mongoose';
import type { IAuditLog } from '@attendance-portal/shared';

const auditLogSchema = new Schema(
  {
    action: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetResource: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    before: { type: Schema.Types.Mixed, required: true },
    after: { type: Schema.Types.Mixed, required: true },
    ipAddress: { type: String, required: true },
    timestamp: { type: Date, required: true, default: () => new Date() },
  },
  {
    // No timestamps option — timestamp field is managed explicitly above.
    // AuditLog is APPEND-ONLY: disable updates at the schema level.
    strict: true,
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Lookup all audit entries for a specific resource document
auditLogSchema.index({ targetResource: 1, targetId: 1 });

// Admin audit trail, newest first
auditLogSchema.index({ timestamp: -1 });

// Per-performer activity log
auditLogSchema.index({ performedBy: 1, timestamp: -1 });

// ─── Append-only guard ────────────────────────────────────────────────────────
// Block any attempt to call .save() on an existing document or use update operations.
auditLogSchema.pre('updateOne', () => {
  throw new Error('AuditLog is append-only. Updates are not permitted.');
});
auditLogSchema.pre('findOneAndUpdate', () => {
  throw new Error('AuditLog is append-only. Updates are not permitted.');
});
auditLogSchema.pre('updateMany', () => {
  throw new Error('AuditLog is append-only. Updates are not permitted.');
});

// ─── Model ────────────────────────────────────────────────────────────────────

const AuditLog = (
  models['AuditLog'] ?? model('AuditLog', auditLogSchema)
) as Model<IAuditLog>;

export default AuditLog;
