import { Router } from 'express';
import { listShiftsHandler } from '../controllers/shifts.controller';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';

const shiftsRouter = Router();

// GET /api/v1/shifts — returns all active shifts (admin + manager only)
shiftsRouter.get(
  '/',
  authenticateJWT,
  requireRole(['admin', 'manager']),
  listShiftsHandler,
);

export default shiftsRouter;
