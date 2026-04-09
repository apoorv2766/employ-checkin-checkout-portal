import { Router } from 'express';
import {
  monthlyReportHandler,
  departmentReportHandler,
  exportCsvHandler,
} from '../controllers/reports.controller';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateJWT);

/**
 * @swagger
 * /api/v1/reports/monthly:
 *   get:
 *     summary: Get monthly attendance report (admin / manager)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-\d{2}$'
 *           example: '2024-06'
 *         description: Month in YYYY-MM format
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *         description: Filter by employee ObjectId
 *     responses:
 *       200:
 *         description: Monthly report data
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
 *                     type: object
 *                     properties:
 *                       employee:
 *                         $ref: '#/components/schemas/UserProfile'
 *                       totalDays:
 *                         type: integer
 *                       presentDays:
 *                         type: integer
 *                       absentDays:
 *                         type: integer
 *                       lateDays:
 *                         type: integer
 *                       totalHours:
 *                         type: number
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
// GET /api/v1/reports/monthly   — admin + manager (manager sees own dept via query param)
router.get('/monthly', requireRole(['admin', 'manager']), monthlyReportHandler);

/**
 * @swagger
 * /api/v1/reports/department:
 *   get:
 *     summary: Get department-wise attendance summary (admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-\d{2}$'
 *           example: '2024-06'
 *     responses:
 *       200:
 *         description: Department report data
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
 *                     type: object
 *                     properties:
 *                       department:
 *                         type: string
 *                       totalEmployees:
 *                         type: integer
 *                       avgAttendanceRate:
 *                         type: number
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
// GET /api/v1/reports/department — admin only
router.get('/department', requireRole(['admin']), departmentReportHandler);

/**
 * @swagger
 * /api/v1/reports/export:
 *   get:
 *     summary: Export attendance data as CSV (admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-\d{2}$'
 *           example: '2024-06'
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: CSV file stream
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
// GET /api/v1/reports/export    — admin only
router.get('/export', requireRole(['admin']), exportCsvHandler);

export default router;
