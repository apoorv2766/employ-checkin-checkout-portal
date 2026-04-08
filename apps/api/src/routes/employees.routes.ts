import { Router } from 'express';
import {
  listEmployeesHandler,
  getOwnProfileHandler,
  updateOwnProfileHandler,
  getEmployeeHandler,
  createEmployeeHandler,
  updateEmployeeHandler,
  deactivateEmployeeHandler,
  unlockAccountHandler,
} from '../controllers/employees.controller';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  updateOwnProfileSchema,
} from '@attendance-portal/shared';

const router = Router();

// All employee routes require auth
router.use(authenticateJWT);

// ── Self-service (all authenticated roles) ─────────────────────────────────
// GET /api/v1/employees/me
router.get('/me', getOwnProfileHandler);

// PATCH /api/v1/employees/me
router.patch('/me', validate(updateOwnProfileSchema), updateOwnProfileHandler);

// ── Admin-only: list & create ──────────────────────────────────────────────
// GET /api/v1/employees
router.get('/', requireRole(['admin']), listEmployeesHandler);

// POST /api/v1/employees
router.post(
  '/',
  requireRole(['admin']),
  validate(createEmployeeSchema),
  createEmployeeHandler,
);

// ── Admin + manager: read single ───────────────────────────────────────────
// GET /api/v1/employees/:id
router.get('/:id', requireRole(['admin', 'manager']), getEmployeeHandler);

// ── Admin-only: update & soft-delete ──────────────────────────────────────
// PATCH /api/v1/employees/:id
router.patch(
  '/:id',
  requireRole(['admin']),
  validate(updateEmployeeSchema),
  updateEmployeeHandler,
);

// POST /api/v1/employees/:id/unlock  (clear login lock from Redis)
router.post('/:id/unlock', requireRole(['admin']), unlockAccountHandler);

// DELETE /api/v1/employees/:id  (soft-delete — sets isActive: false)
router.delete('/:id', requireRole(['admin']), deactivateEmployeeHandler);

export default router;
