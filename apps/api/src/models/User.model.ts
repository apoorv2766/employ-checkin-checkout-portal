import { Schema, model, models, type Model } from 'mongoose';
import type { IUser } from '@attendance-portal/shared';

const userSchema = new Schema(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      // Never selected by default — callers must explicitly include it
      select: false,
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['employee', 'manager', 'admin'],
      required: true,
      default: 'employee',
    },
    department: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    timezone: { type: String, required: true, default: 'UTC' },
    shift: { type: Schema.Types.ObjectId, ref: 'Shift', required: true },
    isActive: { type: Boolean, required: true, default: true },
    profilePhoto: { type: String },
  },
  {
    timestamps: true, // adds createdAt, updatedAt
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        // Safety net: strip passwordHash even if someone forgets .select('-passwordHash')
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (ret as Record<string, unknown>)['passwordHash'];
        return ret;
      },
    },
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// email and employeeId are already indexed via `unique: true` in the schema field.
// Explicit index declaration for department queries.
userSchema.index({ department: 1 });

// ─── Virtual: fullName ────────────────────────────────────────────────────────
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Prevent model re-compilation during hot-reload in dev.
// Type assertion bypasses Mongoose's Schema<T> vs Model<T> generic mismatch
// (Mongoose infers schema type from definition body, which omits Mongoose-managed
// fields like _id/createdAt/updatedAt that are present on IUser).
const User = (models['User'] ?? model('User', userSchema)) as Model<IUser>;

export default User;
