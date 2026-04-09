# Employee Attendance Portal — Full Requirements & Architecture Spec

> **For AI coding assistants (GitHub Copilot, Cursor, etc.):**  
> This document contains the complete project requirements, tech stack, data models, API contracts, and edge case handling for an Employee Attendance Portal. Use this as your single source of truth. Build features in the order listed in the **Build Order** section.

---

## 1. Project Overview

An internal web application allowing employees to check in / check out, and allowing managers / admins to view attendance records, generate reports, and manage employees and shifts.

**Two user-facing surfaces:**
- **Employee Portal** — Check in, check out, view personal history
- **Admin Dashboard** — Manage employees, view all attendance, run reports, handle corrections

---

## 2. Tech Stack

### Frontend
| Concern | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS |
| UI components | shadcn/ui |
| State management | Zustand |
| Data fetching | TanStack Query (React Query) |
| Forms | React Hook Form + Zod |
| Date handling | date-fns |

### Backend
| Concern | Choice |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express.js |
| Language | TypeScript |
| Validation | Zod |
| Auth | JWT (access + refresh tokens) |
| Password hashing | bcrypt |

### Database & Cache
| Concern | Choice |
|---|---|
| Primary DB | MongoDB Atlas |
| ODM | Mongoose |
| Cache / Sessions | Redis (Upstash or self-hosted) |
| Rate limiting | Redis-backed (ioredis) |

### Deferred (Phase 2)
- Queue: RabbitMQ or AWS SQS
- File storage: AWS S3

---

## 3. Monorepo Structure

```
attendance-portal/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/         # Login, forgot password
│   │   │   ├── (employee)/     # Employee portal pages
│   │   │   │   ├── dashboard/
│   │   │   │   └── history/
│   │   │   └── (admin)/        # Admin dashboard pages
│   │   │       ├── dashboard/
│   │   │       ├── employees/
│   │   │       ├── attendance/
│   │   │       └── reports/
│   │   ├── components/
│   │   │   ├── ui/             # shadcn/ui primitives
│   │   │   ├── attendance/     # Check-in/out card, status badge
│   │   │   ├── employees/      # Employee table, profile card
│   │   │   └── reports/        # Charts, export buttons
│   │   ├── lib/
│   │   │   ├── api/            # API client (axios instance)
│   │   │   ├── hooks/          # Custom React Query hooks
│   │   │   ├── store/          # Zustand stores
│   │   │   └── utils/          # Formatters, date utils
│   │   └── types/              # Shared TypeScript types
│   └── api/                    # Express backend
│       ├── src/
│       │   ├── routes/
│       │   │   ├── auth.routes.ts
│       │   │   ├── attendance.routes.ts
│       │   │   ├── employees.routes.ts
│       │   │   └── reports.routes.ts
│       │   ├── controllers/
│       │   ├── services/
│       │   ├── models/          # Mongoose schemas
│       │   ├── middleware/
│       │   │   ├── auth.middleware.ts
│       │   │   ├── rateLimit.middleware.ts
│       │   │   └── validate.middleware.ts
│       │   ├── lib/
│       │   │   ├── redis.ts
│       │   │   └── mongoose.ts
│       │   └── utils/
│       └── tests/
└── packages/
    └── shared/                 # Types/schemas shared between web and api
        └── src/
            ├── types.ts
            └── schemas.ts      # Zod schemas used by both sides
```

---

## 4. MongoDB Data Models

### 4.1 User (Employee)

```typescript
interface IUser {
  _id: ObjectId;
  employeeId: string;           // Human-readable ID e.g. "EMP-0042"
  email: string;                // Unique, used for login
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: 'employee' | 'manager' | 'admin';
  department: string;
  designation: string;
  phone?: string;
  timezone: string;             // e.g. "Asia/Kolkata" — IANA tz string
  shift: ObjectId;              // ref: Shift
  isActive: boolean;
  profilePhoto?: string;        // URL
  createdAt: Date;
  updatedAt: Date;
}
```

**Mongoose schema notes:**
- Index: `email` (unique), `employeeId` (unique), `department`
- Never return `passwordHash` in API responses (use `.select('-passwordHash')`)

---

### 4.2 Shift

```typescript
interface IShift {
  _id: ObjectId;
  name: string;                 // e.g. "Morning", "Night"
  startTime: string;            // "09:00" in 24h format
  endTime: string;              // "18:00"
  gracePeriodMinutes: number;   // Late arrival tolerance
  workingDays: number[];        // [1,2,3,4,5] = Mon–Fri (ISO weekday)
  timezone: string;             // Shift's base timezone
  isActive: boolean;
  createdAt: Date;
}
```

---

### 4.3 AttendanceRecord

```typescript
interface IAttendanceRecord {
  _id: ObjectId;
  employee: ObjectId;           // ref: User
  date: string;                 // "YYYY-MM-DD" in employee's local timezone
  checkIn: {
    time: Date;                 // UTC timestamp
    location?: { lat: number; lng: number };
    ipAddress?: string;
    deviceInfo?: string;
    method: 'web' | 'mobile' | 'kiosk';
  };
  checkOut?: {
    time: Date;
    location?: { lat: number; lng: number };
    ipAddress?: string;
    deviceInfo?: string;
    method: 'web' | 'mobile' | 'kiosk';
  };
  status: 'present' | 'absent' | 'late' | 'half-day' | 'on-leave';
  isLate: boolean;
  lateByMinutes?: number;
  totalHours?: number;          // Computed on check-out: (checkOut - checkIn) in hours
  isManuallyEdited: boolean;
  editReason?: string;
  editedBy?: ObjectId;          // ref: User (admin/manager)
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Mongoose schema notes:**
- Compound index: `{ employee: 1, date: 1 }` — unique (prevents duplicate records per day)
- Index: `{ date: 1 }`, `{ status: 1 }`, `{ employee: 1, createdAt: -1 }`
- `totalHours` is computed on checkOut and stored (do not recompute on read)

---

### 4.4 LeaveRequest

```typescript
interface ILeaveRequest {
  _id: ObjectId;
  employee: ObjectId;
  type: 'sick' | 'casual' | 'earned' | 'unpaid';
  startDate: string;            // "YYYY-MM-DD"
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: ObjectId;
  reviewedAt?: Date;
  reviewNote?: string;
  createdAt: Date;
}
```

---

### 4.5 AuditLog

```typescript
interface IAuditLog {
  _id: ObjectId;
  action: string;               // e.g. "attendance.manual_edit", "employee.deactivate"
  performedBy: ObjectId;        // ref: User
  targetResource: string;       // e.g. "AttendanceRecord"
  targetId: ObjectId;
  before: Record<string, any>;  // Snapshot before change
  after: Record<string, any>;   // Snapshot after change
  ipAddress: string;
  timestamp: Date;
}
```

**Note:** AuditLog is append-only. Never update or delete audit documents.

---

## 5. API Contract

**Base URL:** `/api/v1`  
**Auth header:** `Authorization: Bearer <access_token>`  
**All responses follow:**
```json
{
  "success": true,
  "data": { ... },
  "message": "optional string",
  "pagination": { "page": 1, "limit": 20, "total": 100 }
}
```
**Error format:**
```json
{
  "success": false,
  "error": { "code": "ALREADY_CHECKED_IN", "message": "Human-readable message" }
}
```

---

### 5.1 Auth Routes `/api/v1/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/login` | None | Login with email + password |
| POST | `/logout` | Required | Invalidate refresh token in Redis |
| POST | `/refresh` | None (cookie) | Exchange refresh token for new access token |
| POST | `/change-password` | Required | Change own password |
| POST | `/forgot-password` | None | Send reset email |
| POST | `/reset-password` | None | Reset with token |

**POST /login — request:**
```json
{ "email": "john@company.com", "password": "..." }
```
**POST /login — response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "user": { "_id": "...", "role": "employee", "firstName": "John", ... }
  }
}
```
- Access token: 15 min expiry, in response body
- Refresh token: 7 day expiry, `httpOnly` cookie

---

### 5.2 Attendance Routes `/api/v1/attendance`

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| POST | `/check-in` | Required | employee | Check in |
| POST | `/check-out` | Required | employee | Check out |
| GET | `/today` | Required | employee | Get today's record for self |
| GET | `/history` | Required | employee | Paginated personal history |
| GET | `/` | Required | admin, manager | All records (filterable) |
| GET | `/:id` | Required | admin, manager | Single record |
| PATCH | `/:id` | Required | admin | Manual correction |
| GET | `/summary/:employeeId` | Required | admin, manager | Monthly summary |

**POST /check-in — request:**
```json
{
  "location": { "lat": 28.6139, "lng": 77.2090 },
  "method": "web"
}
```

**POST /check-in — error codes:**
| Code | HTTP | Meaning |
|---|---|---|
| `ALREADY_CHECKED_IN` | 409 | Already have open session today |
| `OUTSIDE_SHIFT_HOURS` | 422 | Too early / too late for shift |
| `INACTIVE_EMPLOYEE` | 403 | Account deactivated |

**GET /attendance/ — query params:**
- `date` — exact date filter `YYYY-MM-DD`
- `from` / `to` — date range
- `department` — filter by dept
- `status` — `present|absent|late|half-day`
- `employeeId`
- `page`, `limit` (default 20)

**PATCH /:id — request (manual correction):**
```json
{
  "checkIn": "2024-01-15T09:05:00Z",
  "checkOut": "2024-01-15T18:10:00Z",
  "reason": "System was down — employee was present"
}
```
This writes to AuditLog automatically.

---

### 5.3 Employee Routes `/api/v1/employees`

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/` | Required | admin | List all employees |
| POST | `/` | Required | admin | Create employee |
| GET | `/:id` | Required | admin, manager | Get employee |
| PATCH | `/:id` | Required | admin | Update employee |
| DELETE | `/:id` | Required | admin | Soft-delete (set isActive: false) |
| GET | `/me` | Required | employee | Get own profile |
| PATCH | `/me` | Required | employee | Update own profile (limited fields) |

**POST /employees — request:**
```json
{
  "email": "jane@company.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "department": "Engineering",
  "designation": "Software Engineer",
  "role": "employee",
  "shift": "<shiftId>",
  "timezone": "Asia/Kolkata"
}
```
- System auto-generates `employeeId` and a temporary password
- Password is emailed to the employee (Phase 1: log to console, Phase 2: email service)

---

### 5.4 Reports Routes `/api/v1/reports`

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/monthly` | Required | admin, manager | Monthly summary per employee |
| GET | `/department` | Required | admin | Dept-level attendance rate |
| GET | `/export` | Required | admin | Download CSV (sync for now) |

**GET /reports/monthly — query params:**
- `month` — `YYYY-MM`
- `department` — optional filter
- `employeeId` — optional

---

## 6. Authentication & Authorization

### Token Strategy
- **Access token:** JWT, 15 min, stored in memory (JS variable / Zustand) on client
- **Refresh token:** JWT, 7 days, `httpOnly; Secure; SameSite=Strict` cookie
- **Refresh token rotation:** Every refresh call issues a new refresh token and invalidates the old one in Redis
- **Redis key pattern:** `refresh:<userId>:<tokenId>` with 7-day TTL

### Role Matrix

| Action | employee | manager | admin |
|---|---|---|---|
| Check in/out (own) | ✅ | ✅ | ✅ |
| View own history | ✅ | ✅ | ✅ |
| View all attendance | ❌ | ✅ (own dept) | ✅ |
| Manual correction | ❌ | ❌ | ✅ |
| Create employee | ❌ | ❌ | ✅ |
| Deactivate employee | ❌ | ❌ | ✅ |
| View reports | ❌ | ✅ (own dept) | ✅ |
| View audit log | ❌ | ❌ | ✅ |

### Middleware Chain (Express)
```
Request
  → rateLimiter (Redis-backed, 100 req/min per IP)
  → authenticateJWT (verify access token, attach req.user)
  → requireRole(['admin']) (optional, per route)
  → validate(schema) (Zod schema validation)
  → controller
```

---

## 7. Edge Cases & Handling

### Check-in / Check-out

| Edge Case | Handling |
|---|---|
| Double check-in | Redis idempotency key `checkin:<userId>:<date>` — return existing record with 409 |
| Forgot to check out | Nightly cron at 23:59 auto-closes open records, sets status `half-day`, flags `needsReview: true` |
| Check-in outside shift hours | Return `OUTSIDE_SHIFT_HOURS` error; allow override with `force: true` for managers only |
| Overnight shifts (cross-midnight) | Shift `endTime` < `startTime` indicates overnight; `date` is anchored to check-in calendar day |
| Access token expires mid-shift | Frontend silently refreshes via `/auth/refresh` before any API call if token is within 60s of expiry |

### Time & Timezone

| Concern | Handling |
|---|---|
| All timestamps | Stored as UTC in MongoDB |
| `date` field on AttendanceRecord | "YYYY-MM-DD" computed in employee's `timezone` at check-in time (not server timezone) |
| Displaying times | Always convert UTC → user's timezone on the frontend using `date-fns-tz` |
| DST | Use IANA timezone strings + `date-fns-tz` (never manual offsets) |

### Concurrency

| Concern | Handling |
|---|---|
| Race condition on check-in | MongoDB unique compound index `{ employee, date }` as final guard; Redis is first-pass guard |
| Parallel report generation | Mark report as "generating" in Redis; return 202 with polling endpoint |

### Security

| Concern | Handling |
|---|---|
| Brute-force login | Redis rate limiter: 5 failed attempts → 15 min lockout on `login:<email>` |
| JWT secret rotation | Support `JWT_SECRET_PREVIOUS` env var for zero-downtime rotation |
| Admin impersonation | All manual edits write to AuditLog; no endpoint allows setting another user's session |
| SQL / NoSQL injection | All inputs validated through Zod before reaching Mongoose; parameterized queries always |

---

## 8. Frontend Pages & Components

### Employee Portal

**`/dashboard` (employee home)**
- Large check-in / check-out button (state-aware: disabled if already checked in/out)
- Today's status card: check-in time, check-out time, total hours
- Weekly summary strip (5 days, color-coded by status)
- Recent activity list (last 5 records)

**`/history`**
- Calendar view (month) with color dots per day status
- Table below with filterable, paginated records

### Admin Dashboard

**`/admin/dashboard`**
- Today's stats: total present, absent, late, on-leave
- Department attendance rate bar chart
- Live table of who's currently checked in

**`/admin/employees`**
- Searchable, filterable employee table
- Create / edit employee drawer (slide-in panel)
- Deactivate with confirmation dialog

**`/admin/attendance`**
- Full attendance log with filters: date range, department, status, employee
- Row-level manual edit (admin only) with reason input
- Badge colors: green=present, red=absent, amber=late, blue=on-leave

**`/admin/reports`**
- Monthly summary table: employee | days present | days absent | late | total hours
- Department filter
- Export to CSV button

---

## 9. Environment Variables

### API (`apps/api/.env`)
```env
NODE_ENV=development
PORT=4000

# MongoDB
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/attendance

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=your_access_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# App
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000
```

### Web (`apps/web/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

---

## 10. Build Order (Implement in This Sequence)

Follow this order to have a running app as fast as possible:

1. **Monorepo scaffold** — Turborepo or simple npm workspaces, shared tsconfig
2. **MongoDB models** — User, Shift, AttendanceRecord, AuditLog (with indexes)
3. **Auth API** — `/login`, `/logout`, `/refresh` with Redis token store
4. **Auth middleware** — JWT verify, role guard, rate limiter
5. **Employee CRUD API** — full CRUD with role guards
6. **Attendance API** — check-in, check-out, history (with all edge case guards)
7. **Reports API** — monthly summary, CSV export
8. **Next.js auth flow** — login page, token management, route protection via middleware
9. **Employee portal UI** — dashboard, check-in button, history page
10. **Admin dashboard UI** — employees table, attendance log with filters, reports
11. **Manual correction UI** — edit modal with reason, audit log view
12. **Cron job** — auto-close forgotten check-outs at end of shift

---

## 11. Key Implementation Notes for Copilot

- **Never trust client timestamps.** Always use `new Date()` on the server for check-in/out times.
- **Always use `.select('-passwordHash')`** when querying users for API responses.
- **Soft-delete only** — never hard-delete employees or attendance records. Use `isActive: false`.
- **AuditLog is append-only** — never update or delete audit documents.
- **Date field logic:** To compute the `date` string on check-in, convert UTC `now` to the employee's timezone and format as `YYYY-MM-DD`.
- **Refresh token rotation:** On every successful refresh, delete old Redis key and write new one. If the old key is already gone (replay attack), invalidate all tokens for that user.
- **Frontend token management:** Store access token in Zustand (in-memory). On app load, call `/auth/refresh` silently to restore session from httpOnly cookie. Add an Axios request interceptor that checks token expiry and refreshes before sending.
- **React Query keys convention:** `['attendance', 'today']`, `['attendance', 'history', { page, filters }]`, `['employees', employeeId]`
- **Tailwind theme:** Extend with company brand color as `primary`. All status colors: present=`green-500`, late=`amber-500`, absent=`red-500`, on-leave=`blue-500`, half-day=`orange-500`.

---

## 12. Testing Checklist (Per Feature)

- [ ] Check-in creates a record with correct UTC timestamp and local `date` string
- [ ] Double check-in returns 409, not a duplicate record
- [ ] Auto-close cron marks forgotten check-outs correctly
- [ ] Refresh token rotation works; replayed old refresh token is rejected
- [ ] Admin can manually edit a record; AuditLog captures before/after
- [ ] Manager cannot see employees outside their department
- [ ] Employee cannot access admin routes
- [ ] Rate limiter blocks after 5 failed logins for 15 min
- [ ] CSV export contains correct data for selected date range
