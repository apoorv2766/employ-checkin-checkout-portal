import { Router } from 'express';
import {
  loginHandler,
  logoutHandler,
  refreshHandler,
  changePasswordHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
} from '../controllers/auth.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@attendance-portal/shared';

const router = Router();

// POST /api/v1/auth/login
router.post('/login', validate(loginSchema), loginHandler);

// POST /api/v1/auth/logout  (requires auth — needs to know which session to invalidate)
router.post('/logout', authenticateJWT, logoutHandler);

// POST /api/v1/auth/refresh  (reads httpOnly cookie — no auth header needed)
router.post('/refresh', refreshHandler);

// POST /api/v1/auth/change-password
router.post(
  '/change-password',
  authenticateJWT,
  validate(changePasswordSchema),
  changePasswordHandler,
);

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPasswordHandler);

// POST /api/v1/auth/reset-password
router.post('/reset-password', validate(resetPasswordSchema), resetPasswordHandler);

export default router;
