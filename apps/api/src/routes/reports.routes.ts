import { Router } from 'express';
import {
  monthlyReportHandler,
  departmentReportHandler,
  exportCsvHandler,
} from '../controllers/reports.controller';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateJWT);

// GET /api/v1/reports/monthly   — admin + manager (manager sees own dept via query param)
router.get('/monthly', requireRole(['admin', 'manager']), monthlyReportHandler);

// GET /api/v1/reports/department — admin only
router.get('/department', requireRole(['admin']), departmentReportHandler);

// GET /api/v1/reports/export    — admin only
router.get('/export', requireRole(['admin']), exportCsvHandler);

export default router;
