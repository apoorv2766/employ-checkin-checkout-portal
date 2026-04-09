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

<<<<<<< HEAD
/**
 * @swagger
 * /api/v1/attendance/check-in:
 *   post:
 *     summary: Check in for the current day
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CheckInRequest'
 *     responses:
 *       201:
 *         description: Check-in recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/AttendanceRecord'
 *       409:
 *         description: Already checked in today
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
// POST /api/v1/attendance/check-in
router.post('/check-in', validate(checkInSchema), checkInHandler);

/**
 * @swagger
 * /api/v1/attendance/check-out:
 *   post:
 *     summary: Check out for the current day
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CheckOutRequest'
 *     responses:
 *       200:
 *         description: Check-out recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/AttendanceRecord'
 *       400:
 *         description: Not checked in yet
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
// POST /api/v1/attendance/check-out
router.post('/check-out', validate(checkOutSchema), checkOutHandler);

/**
 * @swagger
 * /api/v1/attendance/today:
 *   get:
 *     summary: Get today's attendance record for the authenticated employee
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Today's record (null if not checked in yet)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   nullable: true
 *                   $ref: '#/components/schemas/AttendanceRecord'
 */
// GET /api/v1/attendance/today
router.get('/today', getTodayHandler);

/**
 * @swagger
 * /api/v1/attendance/history:
 *   get:
 *     summary: Get attendance history for the authenticated employee
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *           example: '2024-06-01'
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *           example: '2024-06-30'
 *     responses:
 *       200:
 *         description: Paginated attendance history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AttendanceRecord'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */
=======
// POST /api/v1/attendance/check-in
router.post('/check-in', validate(checkInSchema), checkInHandler);

// POST /api/v1/attendance/check-out
router.post('/check-out', validate(checkOutSchema), checkOutHandler);

// GET /api/v1/attendance/today
router.get('/today', getTodayHandler);

>>>>>>> 9c97959f03c8689d19c25bea64a01e0882f31736
// GET /api/v1/attendance/history
router.get('/history', getHistoryHandler);

// ── Admin / manager: all records ───────────────────────────────────────────

<<<<<<< HEAD
/**
 * @swagger
 * /api/v1/attendance:
 *   get:
 *     summary: List all attendance records with filters (admin / manager)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *           example: '2024-06-01'
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [present, absent, late, half-day, on-leave]
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated list of attendance records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AttendanceRecord'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
=======
>>>>>>> 9c97959f03c8689d19c25bea64a01e0882f31736
// GET /api/v1/attendance/ — list with filters
// Note: this route must be defined BEFORE /:id to avoid shadowing
router.get('/', requireRole(['admin', 'manager']), getAllRecordsHandler);

// ── Admin / manager: summary ───────────────────────────────────────────────

<<<<<<< HEAD
/**
 * @swagger
 * /api/v1/attendance/summary/{employeeId}:
 *   get:
 *     summary: Get attendance summary for a specific employee (admin / manager)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the employee
 *     responses:
 *       200:
 *         description: Attendance summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalDays:
 *                       type: integer
 *                     presentDays:
 *                       type: integer
 *                     absentDays:
 *                       type: integer
 *                     lateDays:
 *                       type: integer
 *                     totalHours:
 *                       type: number
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: Employee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
=======
>>>>>>> 9c97959f03c8689d19c25bea64a01e0882f31736
// GET /api/v1/attendance/summary/:employeeId
router.get('/summary/:employeeId', requireRole(['admin', 'manager']), getSummaryHandler);

// ── Admin / manager: single record ────────────────────────────────────────

<<<<<<< HEAD
/**
 * @swagger
 * /api/v1/attendance/{id}:
 *   get:
 *     summary: Get a single attendance record by ID (admin / manager)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the attendance record
 *     responses:
 *       200:
 *         description: Attendance record found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/AttendanceRecord'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: Record not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *   patch:
 *     summary: Manually correct a attendance record (admin only)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the attendance record
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AttendanceCorrectionRequest'
 *     responses:
 *       200:
 *         description: Record corrected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/AttendanceRecord'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: Record not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
=======
>>>>>>> 9c97959f03c8689d19c25bea64a01e0882f31736
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
