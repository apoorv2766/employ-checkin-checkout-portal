import { Router } from 'express';
import { listShiftsHandler } from '../controllers/shifts.controller';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';

const shiftsRouter = Router();

/**
 * @swagger
 * /api/v1/shifts:
 *   get:
 *     summary: List all active shifts (admin / manager)
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active shifts
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
 *                     $ref: '#/components/schemas/Shift'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
// GET /api/v1/shifts — returns all active shifts (admin + manager only)
shiftsRouter.get(
  '/',
  authenticateJWT,
  requireRole(['admin', 'manager']),
  listShiftsHandler,
);

export default shiftsRouter;
