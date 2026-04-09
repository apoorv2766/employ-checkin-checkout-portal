import { Schema, model, models, type Model } from 'mongoose';
import type { IShift } from '@attendance-portal/shared';

const shiftSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    startTime: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => /^\d{2}:\d{2}$/.test(v),
        message: 'startTime must be in HH:MM (24-hour) format',
      },
    },
    endTime: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => /^\d{2}:\d{2}$/.test(v),
        message: 'endTime must be in HH:MM (24-hour) format',
      },
    },
    gracePeriodMinutes: { type: Number, required: true, default: 0, min: 0 },
    workingDays: {
      type: [Number],
      required: true,
      validate: {
        validator: (days: number[]) => days.every((d) => d >= 1 && d <= 7),
        message: 'workingDays must be ISO weekdays 1 (Mon) – 7 (Sun)',
      },
    },
    timezone: { type: String, required: true, default: 'UTC' },
    isActive: { type: Boolean, required: true, default: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// No extra explicit indexes needed beyond the default _id index for Shift.
// Queries are typically by _id when resolving User.shift reference.

const Shift = (models['Shift'] ?? model('Shift', shiftSchema)) as Model<IShift>;

export default Shift;
