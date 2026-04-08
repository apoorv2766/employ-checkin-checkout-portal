/**
 * Seed script — creates a default Shift and first Admin user.
 *
 * Usage (from the repo root):
 *   node "C:\Users\BodarJayMukeshbhai\Downloads\checkin_checkout\attendance-portal\node_modules\ts-node\dist\bin.js" \
 *     --project apps/api/tsconfig.json \
 *     --require tsconfig-paths/register \
 *     apps/api/src/seed.ts
 *
 *   OR (simpler — plain JS via tsx):
 *   npx tsx apps/api/src/seed.ts
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { Schema, model, models } from 'mongoose';

// ── Inline minimal models (avoids import-order issues in a one-shot script) ─
const shiftSchema = new Schema({
  name:               { type: String, required: true },
  startTime:          { type: String, required: true },
  endTime:            { type: String, required: true },
  gracePeriodMinutes: { type: Number, default: 15 },
  workingDays:        { type: [Number], required: true },
  timezone:           { type: String, default: 'Asia/Kolkata' },
  isActive:           { type: Boolean, default: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

const userSchema = new Schema({
  employeeId:   { type: String, required: true, unique: true },
  email:        { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  firstName:    { type: String, required: true },
  lastName:     { type: String, required: true },
  role:         { type: String, enum: ['employee', 'manager', 'admin'], default: 'admin' },
  department:   { type: String, required: true },
  designation:  { type: String, required: true },
  timezone:     { type: String, default: 'Asia/Kolkata' },
  shift:        { type: Schema.Types.ObjectId, ref: 'Shift', required: true },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

const Shift = models['Shift'] ?? model('Shift', shiftSchema);
const User  = models['User']  ?? model('User', userSchema);

// ── Config — edit these before running ──────────────────────────────────────
const ADMIN = {
  email:       'admin@example.com',
  password:    'Admin1234!',          // change after first login
  firstName:   'Super',
  lastName:    'Admin',
  department:  'Operations',
  designation: 'System Administrator',
  timezone:    'Asia/Kolkata',
};

const DEFAULT_SHIFT = {
  name:               'General Shift',
  startTime:          '09:00',
  endTime:            '18:00',
  gracePeriodMinutes: 15,
  workingDays:        [1, 2, 3, 4, 5],   // Mon–Fri
  timezone:           'Asia/Kolkata',
};

// ── Main ────────────────────────────────────────────────────────────────────
async function seed() {
  const uri = process.env['MONGODB_URI'];
  if (!uri) throw new Error('MONGODB_URI is not set in .env');

  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  // 1. Create shift (skip if already exists)
  let shift = await Shift.findOne({ name: DEFAULT_SHIFT.name });
  if (shift) {
    console.log(`ℹ️  Shift "${DEFAULT_SHIFT.name}" already exists — skipping`);
  } else {
    shift = await Shift.create(DEFAULT_SHIFT);
    console.log(`✅ Created shift: ${DEFAULT_SHIFT.name} (${shift._id})`);
  }

  // 2. Create admin user (skip if already exists)
  const existing = await User.findOne({ email: ADMIN.email });
  if (existing) {
    console.log(`ℹ️  User "${ADMIN.email}" already exists — skipping`);
  } else {
    const passwordHash = await bcrypt.hash(ADMIN.password, 12);
    const admin = await User.create({
      employeeId:  'EMP-0001',
      email:       ADMIN.email,
      passwordHash,
      firstName:   ADMIN.firstName,
      lastName:    ADMIN.lastName,
      role:        'admin',
      department:  ADMIN.department,
      designation: ADMIN.designation,
      timezone:    ADMIN.timezone,
      shift:       shift._id,
      isActive:    true,
    });
    console.log(`✅ Created admin: ${admin.email}  (${admin._id})`);
    console.log(`🔑 Login with:  ${ADMIN.email}  /  ${ADMIN.password}`);
  }

  await mongoose.disconnect();
  console.log('✅ Done — database seeded');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
