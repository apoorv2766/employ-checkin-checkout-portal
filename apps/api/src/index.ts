import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { connectMongoose } from './lib/mongoose';
import { apiRateLimiter } from './middleware/rateLimit.middleware';
import { appErrorHandler } from './controllers/auth.controller';
import authRouter from './routes/auth.routes';
import attendanceRouter from './routes/attendance.routes';
import employeesRouter from './routes/employees.routes';
import reportsRouter from './routes/reports.routes';
import shiftsRouter from './routes/shifts.routes';
import { registerAutoCloseCron } from './cron/autoClose';

const app = express();
const PORT = process.env['PORT'] ?? 4000;

// When deployed behind a reverse proxy (nginx, ALB) trust the first hop
app.set('trust proxy', 1);

// ─── Security & parsing middleware ────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: (process.env['ALLOWED_ORIGINS'] ?? 'http://localhost:3000').split(','),
    credentials: true,
  }),
);
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: false, limit: '5mb' }));
app.use(cookieParser());

// ─── Global rate limiter: 100 req/min per IP ──────────────────────────────────
app.use(apiRateLimiter);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/attendance', attendanceRouter);
app.use('/api/v1/employees', employeesRouter);
app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/shifts', shiftsRouter);

// ─── Global error handler (must be last) ─────────────────────────────────────
app.use(appErrorHandler);

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  await connectMongoose();

  registerAutoCloseCron();

  app.listen(PORT, () => {
    console.log(`[api] Server running on http://localhost:${PORT}`);
  });
}

main().catch((err: unknown) => {
  console.error('[api] Fatal startup error:', err);
  process.exit(1);
});
