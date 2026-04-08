import { Router } from 'express';
import {
  checkInHandler,
  checkOutHandler,
  getTodayHandler,
  getHistoryHandler,
  getAllRecordsHandler,
  getRecordHandler,
  correctRecordHandler,
  getSummaryHandler,
} from '../controllers/attendance.controller';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { checkInSchema, checkOutSchema, attendanceCorrectionSchema } from '@attendance-portal/shared';

const router = Router();

// All attendance routes require auth
router.use(authenticateJWT);

// ── Employee self-service ──────────────────────────────────────────────────

// POST /api/v1/attendance/check-in
router.post('/check-in', validate(checkInSchema), checkInHandler);

// POST /api/v1/attendance/check-out
router.post('/check-out', validate(checkOutSchema), checkOutHandler);

// GET /api/v1/attendance/today
router.get('/today', getTodayHandler);

// GET /api/v1/attendance/history
router.get('/history', getHistoryHandler);

// ── Admin / manager: all records ───────────────────────────────────────────

// GET /api/v1/attendance/ — list with filters
// Note: this route must be defined BEFORE /:id to avoid shadowing
router.get('/', requireRole(['admin', 'manager']), getAllRecordsHandler);

// ── Admin / manager: summary ───────────────────────────────────────────────

// GET /api/v1/attendance/summary/:employeeId
router.get('/summary/:employeeId', requireRole(['admin', 'manager']), getSummaryHandler);

// ── Admin / manager: single record ────────────────────────────────────────

// GET /api/v1/attendance/:id
router.get('/:id', requireRole(['admin', 'manager']), getRecordHandler);

// ── Admin only: manual correction ─────────────────────────────────────────

// PATCH /api/v1/attendance/:id
router.patch(
  '/:id',
  requireRole(['admin']),
  validate(attendanceCorrectionSchema),
  correctRecordHandler,
);

export default router;
