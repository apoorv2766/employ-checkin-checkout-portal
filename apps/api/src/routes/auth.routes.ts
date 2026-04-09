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

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Log in and obtain access + refresh tokens
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
// POST /api/v1/auth/login
router.post('/login', validate(loginSchema), loginHandler);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Log out and invalidate the current session
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
// POST /api/v1/auth/logout  (requires auth — needs to know which session to invalidate)
router.post('/logout', authenticateJWT, logoutHandler);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh the access token using the httpOnly refresh cookie
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: New access token issued
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
 *                     accessToken:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIs...
 *       401:
 *         description: No valid refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
// POST /api/v1/auth/refresh  (reads httpOnly cookie — no auth header needed)
router.post('/refresh', refreshHandler);

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   post:
 *     summary: Change password for the currently authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Current password incorrect or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
// POST /api/v1/auth/change-password
router.post(
  '/change-password',
  authenticateJWT,
  validate(changePasswordSchema),
  changePasswordHandler,
);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Send a password-reset email
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: Reset link sent if the email exists
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
// POST /api/v1/auth/forgot-password
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPasswordHandler);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password using a token received by email
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
// POST /api/v1/auth/reset-password
router.post('/reset-password', validate(resetPasswordSchema), resetPasswordHandler);

export default router;
