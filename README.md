# Attendance Portal

A full-stack **Employee Attendance Management System** built as an npm monorepo.  
Employees can check in / check out from a self-service portal; managers and admins get a rich dashboard with attendance records, manual corrections, department reports, and CSV exports.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Monorepo Structure](#monorepo-structure)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Running with Docker (Recommended)](#running-with-docker-recommended)
- [Running without Docker](#running-without-docker)
- [Seeding the Database](#seeding-the-database)
- [Available Scripts](#available-scripts)
- [API Reference](#api-reference)
- [Swagger API Docs](#swagger-api-docs)
- [Roles & Permissions](#roles--permissions)
- [Default Credentials](#default-credentials)
- [Postman Collection](#postman-collection)
- [Free Deployment Guide](#free-deployment-guide)

---

## Project Overview

| Feature | Details |
|---|---|
| Employee self-service | Check-in / Check-out with geolocation |
| Attendance history | Paginated per-employee log |
| Manual correction | Admin/manager can amend check-in or check-out time with a reason |
| Employee management | CRUD — create, update, deactivate employees |
| Shift management | Configurable shifts (start/end time, grace period, working days) |
| Reports | Monthly summary & department breakdown; CSV export |
| Auto-close cron | Automatically closes open sessions at shift end |
| JWT auth | Short-lived access token (15 min) + httpOnly refresh token (7 days) |
| Rate limiting | 100 req / min per IP |

---

## Tech Stack

### Backend (`apps/api`)
- **Runtime**: Node.js 20 + TypeScript
- **Framework**: Express 4
- **Database**: MongoDB 7 via Mongoose 8
- **Cache / Token Blocklist**: Redis 7 (ioredis)
- **Auth**: JWT (access + refresh tokens), bcrypt
- **Validation**: Zod (shared schemas)
- **Cron**: node-cron (auto-close open sessions)

### Frontend (`apps/web`)
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript + React 18
- **Styling**: Tailwind CSS
- **State**: Zustand (auth + toast stores)
- **Data Fetching**: TanStack React Query v5
- **Forms**: React Hook Form + Zod

### Shared (`packages/shared`)
- Zod schemas, TypeScript interfaces, and enums shared between API and web

### Infrastructure
- **Docker Compose**: MongoDB + Redis (single command spin-up)
- **Proxy**: Next.js `rewrites()` forwards `/api/v1/*` to the Express API so auth cookies land on the same origin

---

## Monorepo Structure

```
attendance-portal/
├── apps/
│   ├── api/                    # Express backend
│   │   ├── src/
│   │   │   ├── controllers/    # Route handlers
│   │   │   ├── services/       # Business logic
│   │   │   ├── models/         # Mongoose models
│   │   │   ├── routes/         # Express routers
│   │   │   ├── middleware/     # Auth, validation, rate-limit
│   │   │   ├── cron/           # Auto-close attendance cron
│   │   │   ├── utils/          # AppError, response helpers
│   │   │   ├── lib/            # Mongoose + Redis clients
│   │   │   ├── seed.ts         # DB seed script
│   │   │   └── index.ts        # App entry point
│   │   ├── .env                # API environment variables
│   │   └── tsconfig.json
│   │
│   └── web/                    # Next.js frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/     # Login page
│       │   │   ├── (admin)/    # Admin dashboard, employees, attendance, reports
│       │   │   └── (employee)/ # Employee dashboard + history
│       │   ├── components/     # Shared UI components (Toaster, GlobalLoader, etc.)
│       │   └── lib/
│       │       ├── api/        # Axios client + endpoint helpers
│       │       ├── hooks/      # React Query hooks (useEmployees, useAttendance, …)
│       │       └── store/      # Zustand stores (auth, toast)
│       ├── .env.local          # Web environment variables
│       └── next.config.js      # Rewrites proxy config
│
├── packages/
│   └── shared/                 # Zod schemas + TypeScript types
│       └── src/
│           ├── schemas.ts
│           └── types.ts
│
├── docker-compose.yml          # MongoDB + Redis services
├── package.json                # Root workspace config
└── AttendancePortal.postman_collection.json
```

---

## Prerequisites

| Tool | Minimum version |
|---|---|
| Node.js | 20.x |
| npm | 10.x (bundled with Node 20) |
| Docker Desktop | Any recent version |

> If you prefer to run MongoDB and Redis **without Docker**, skip to [Running without Docker](#running-without-docker).

---

## Environment Variables

### `apps/api/.env`

Create this file (it is git-ignored). Copy the block below and change the JWT secrets before deploying to any shared environment.

```env
# MongoDB
MONGODB_URI=mongodb://root:secret@localhost:27017/attendance?authSource=admin

# Redis (Docker maps container port 6379 → host port 6380)
REDIS_URL=redis://localhost:6380

# JWT — CHANGE these values in production!
JWT_ACCESS_SECRET=change-me-to-a-random-256-bit-secret-in-production
JWT_REFRESH_SECRET=change-me-to-another-random-256-bit-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Server
PORT=4000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002

# Cookie
NODE_ENV=development
```

### `apps/web/.env.local`

```env
# Relative path — Next.js rewrites proxy forwards to the API, so cookies stay same-origin
NEXT_PUBLIC_API_URL=/api/v1

# Internal URL Next.js uses server-side to proxy requests to the API
API_INTERNAL_URL=http://localhost:4000
```

---

## Running with Docker (Recommended)

Docker handles MongoDB and Redis. The two app servers still run on your host machine via Node.

### Step 1 — Clone and install

```bash
git clone <repo-url>
cd attendance-portal
npm install
```

### Step 2 — Create environment files

Create `apps/api/.env` and `apps/web/.env.local` using the values from the [Environment Variables](#environment-variables) section above.

### Step 3 — Start the database services

```bash
docker compose up -d
```

This starts:
- **MongoDB 7** on `localhost:27017` (user: `root`, password: `secret`, db: `attendance`)
- **Redis 7** on `localhost:6380` (mapped from container port 6379)

Verify both are running:

```bash
docker compose ps
```

### Step 4 — Seed the database

Run once to create the default shift and the first admin user:

```bash
npx tsx apps/api/src/seed.ts
```

### Step 5 — Start the development servers

```bash
npm run dev
```

This concurrently starts:
- **API** → `http://localhost:4000`
- **Web** → `http://localhost:3000`

Open your browser at **http://localhost:3000** and log in with the [default admin credentials](#default-credentials).

---

## Running without Docker

Install and run MongoDB and Redis locally, then update `apps/api/.env`:

```env
MONGODB_URI=mongodb://localhost:27017/attendance
REDIS_URL=redis://localhost:6379
```

Then follow Steps 1, 2, 4, and 5 from above.

---

## Seeding the Database

The seed script creates:
- A **default shift** — "General Shift" (09:00–18:00, Mon–Fri, Asia/Kolkata, 15 min grace)
- A **first admin user** — `admin@example.com` / `Admin1234!`

```bash
# Run from the repo root
npx tsx apps/api/src/seed.ts
```

> The script is idempotent — running it twice will not create duplicates.

---

## Available Scripts

Run from the **repo root** (`attendance-portal/`):

### One-command startup

| Command | Description |
|---|---|
| `npm run start:all:dev` | **Recommended** — starts Docker containers (MongoDB + Redis + Mongo Express) then runs API + Web concurrently |
| `npm run stop` | Stops all Docker containers (`docker compose down`) |

### Development

| Command | Description |
|---|---|
| `npm run dev` | Start API + Web concurrently in watch mode (Docker must already be running) |
| `npm run build` | Build all workspaces |
| `npm run lint` | Lint all workspaces |
| `npm run test` | Run tests across all workspaces |

### Single workspace

```bash
npm run dev --workspace=apps/api    # API only  → http://localhost:4000
npm run dev --workspace=apps/web    # Web only  → http://localhost:3000
```

### Running ports

| Service | URL |
|---|---|
| Web (Next.js) | http://localhost:3000 |
| API (Express) | http://localhost:4000 |
| MongoDB | localhost:27017 |
| Redis | localhost:6380 |
| Mongo Express (DB UI) | http://localhost:8081 |

---


## Swagger API Docs

Interactive API documentation is available via Swagger UI when running locally:

- [Swagger UI — http://localhost:4000/api-docs](http://localhost:4000/api-docs)

You can explore all endpoints, schemas, and try requests directly from the browser.

---
## API Reference

Base URL: `http://localhost:4000/api/v1`

### Auth

| Method | Endpoint | Description | Auth required |
|---|---|---|---|
| POST | `/auth/login` | Login, returns access token + sets refresh cookie | No |
| POST | `/auth/logout` | Invalidate refresh token | Yes |
| POST | `/auth/refresh` | Rotate access token using refresh cookie | No (cookie) |
| POST | `/auth/change-password` | Change own password | Yes |
| POST | `/auth/forgot-password` | Request password reset email | No |
| POST | `/auth/reset-password` | Reset password with token | No |

### Attendance

| Method | Endpoint | Description | Auth required |
|---|---|---|---|
| POST | `/attendance/check-in` | Employee check-in | Employee |
| POST | `/attendance/check-out` | Employee check-out | Employee |
| GET | `/attendance/today` | Today's record for the logged-in employee | Employee |
| GET | `/attendance/history` | Paginated personal history | Employee |
| GET | `/attendance` | All records (admin/manager) | Admin / Manager |
| GET | `/attendance/:id` | Single record by ID | Admin / Manager |
| PATCH | `/attendance/:id` | Manual correction with reason | Admin / Manager |

### Employees

| Method | Endpoint | Description | Auth required |
|---|---|---|---|
| GET | `/employees` | List all employees (filterable) | Admin / Manager |
| GET | `/employees/me` | Own profile | Employee |
| PATCH | `/employees/me` | Update own profile | Employee |
| GET | `/employees/:id` | Employee by ID | Admin / Manager |
| POST | `/employees` | Create employee | Admin |
| PATCH | `/employees/:id` | Update employee | Admin |
| DELETE | `/employees/:id` | Deactivate employee (soft delete) | Admin |

### Shifts

| Method | Endpoint | Description | Auth required |
|---|---|---|---|
| GET | `/shifts` | List all active shifts | Admin / Manager |

### Reports

| Method | Endpoint | Description | Auth required |
|---|---|---|---|
| GET | `/reports/monthly` | Monthly attendance summary | Admin / Manager |
| GET | `/reports/department` | Per-department breakdown | Admin / Manager |
| GET | `/reports/export` | Download CSV report | Admin / Manager |

### Health

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Service health check |

---

## Roles & Permissions

| Role | Can do |
|---|---|
| **employee** | Check in/out, view own history and profile |
| **manager** | All employee actions + view all attendance, run reports, do manual corrections |
| **admin** | All manager actions + create/update/deactivate employees |

---

## Default Credentials

| Field | Value |
|---|---|
| Email | `admin@example.com` |
| Password | `Admin1234!` |
| Role | `admin` |

> Change the password immediately after the first login in any shared or production environment.

---

## Postman Collection

A ready-to-use Postman collection with all 20 API requests is included at the root of the repo:

```
AttendancePortal.postman_collection.json
```

**How to import:**
1. Open Postman
2. Click **Import**
3. Select `AttendancePortal.postman_collection.json`
4. Set the `baseUrl` collection variable to `http://localhost:4000/api/v1`
5. Run the **Login** request first — the collection auto-captures the access token

---

## Free Deployment Guide

Deploy a live demo at **zero cost** using this stack:

| Layer | Service | Free Tier |
|---|---|---|
| **Frontend** (Next.js) | [Vercel](https://vercel.com) | Unlimited deploys, custom domain |
| **Backend** (Express) | [Render](https://render.com) | Free web service (sleeps after 15 min idle) |
| **MongoDB** | [MongoDB Atlas](https://cloud.mongodb.com) | M0 cluster — 512 MB free forever |
| **Redis** | [Upstash](https://upstash.com) | 10,000 commands/day free forever |

---

### Step 1 — MongoDB Atlas

1. Create account → **New Project** → **Build a Cluster** → choose **M0 Free**
2. Create a DB user (username + password)
3. Under **Network Access** → Add `0.0.0.0/0` (allow all IPs for demo)
4. Copy your connection string:

```
mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/attendance?retryWrites=true&w=majority
```

---

### Step 2 — Upstash Redis

1. Create account → **Create Database** → choose **Redis** → pick the region closest to you
2. Copy the **Redis URL** (e.g. `rediss://default:xxx@xxx.upstash.io:6379`)

---

### Step 3 — Render (API Backend)

1. Push your code to GitHub
2. Render → **New** → **Web Service** → connect repo
3. Settings:
   - **Root Directory**: `apps/api`
   - **Build Command**: `npm install && npx tsc`
   - **Start Command**: `node dist/index.js`
4. Add environment variables:

```env
MONGODB_URI=<Atlas connection string>
REDIS_URL=<Upstash Redis URL>
JWT_ACCESS_SECRET=<random 32+ char string>
JWT_REFRESH_SECRET=<another random 32+ char string>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://your-app.vercel.app
ALLOWED_ORIGINS=https://your-app.vercel.app
```

5. Deploy → copy your Render URL (e.g. `https://attendance-api.onrender.com`)

---

### Step 4 — Vercel (Frontend)

1. Go to [vercel.com](https://vercel.com) → **Import Git Repository**
2. Set **Root Directory** to `apps/web`
3. Add environment variables:

```env
NEXT_PUBLIC_API_URL=/api/v1
API_INTERNAL_URL=https://attendance-api.onrender.com
```

4. Deploy → copy your Vercel URL (e.g. `https://attendance-portal.vercel.app`)
5. Go back to Render and update `FRONTEND_URL` and `ALLOWED_ORIGINS` to your Vercel URL

---

### Step 5 — Seed the Database

Run once locally, pointing at your Atlas cluster:

```bash
MONGODB_URI="<Atlas URI>" npx tsx apps/api/src/seed.ts
```

This creates the default shift and the first admin account (`admin@example.com` / `Admin1234!`).

---

### How the Proxy Works

Vercel's `next.config.js` rewrites `/api/v1/*` → `API_INTERNAL_URL/api/v1/*`.  
This means the browser always talks to the **same Vercel origin**, so `httpOnly` refresh cookies work without any CORS or `sameSite` issues — no code changes needed.

---

### ⚠️ Free Tier Caveat

Render's free web service **sleeps after 15 minutes of inactivity**. The first request after sleep takes ~30 seconds to wake up. This is fine for demos. Upgrade to Render's $7/mo plan to eliminate cold starts.

