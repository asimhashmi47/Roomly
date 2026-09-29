# Roomly: Meeting Room Booking

A small meeting-room booking app with one engineering goal: **two people can never hold overlapping bookings for the same room, even when their requests arrive at the same instant.** The database, not the UI or the API code, makes that guarantee.

## Features

- JWT sign-in with two roles: `ADMIN` and `USER`, enforced on the server
- Room cards with live "free now / in use" status, and a per-room day timeline with previous, next and today navigation
- Booking modal with instant client validation, a live availability hint, and graceful handling of lost races (HTTP 409)
- Admin: dashboard, room management, user management, searchable audit log, filterable system log
- Rules: end after start, not in the past, at most 4 hours, room and user must exist
- Loading skeletons, empty states, error states, toasts, keyboard and screen-reader support, reduced-motion support

## Tech stack

| Layer | Choice |
| --- | --- |
| Backend | Node.js 22, TypeScript (strict), Fastify, Prisma, Zod, JWT, bcrypt |
| Database | SQLite (single file, no server to install) |
| Frontend | React, TypeScript, Vite, Tailwind CSS v4, React Router, framer-motion, Radix Dialog, Sonner |
| Tests | Vitest against a real SQLite database |

## Architecture

```
React SPA  --/api-->  Fastify (auth, zod validation, role checks)  -->  Prisma  -->  SQLite
                                                                                      ^
                                                       BEFORE INSERT trigger rejects overlaps
```

```
backend/
  prisma/           schema.prisma, migrations (incl. the overlap trigger), seed.ts
  src/
    app.ts server.ts
    config/ lib/ plugins/          env, errors, logger, audit, JWT, auth hooks
    modules/{auth,users,rooms,bookings,audit}/routes.ts
  tests/            bookings.test.ts (19 tests)
frontend/src/
  auth/ lib/ hooks/ components/ pages/
```

**Time zones:** every timestamp on the wire and in the database is UTC (ISO-8601 with an offset). The browser converts to and from the viewer's local time.

## Setup

Requires Node.js 20+ and npm. No database server or Docker is needed.

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm --prefix backend install
   npm --prefix frontend install
   ```
3. Configure the backend: copy `backend/.env.example` to `backend/.env` and set a long random `JWT_SECRET`.
4. Create the database and apply migrations:
   ```bash
   npm --prefix backend run db:migrate
   ```
5. Seed development data:
   ```bash
   npm --prefix backend run db:seed
   ```
6. Start the backend (port 4000):
   ```bash
   npm --prefix backend run dev
   ```
7. Start the frontend (port 5173, proxies `/api` to the backend):
   ```bash
   npm --prefix frontend run dev
   ```

Open http://localhost:5173.

### Development-only credentials

Created by the seed. Never use these outside local development.

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@example.com | `Password123!` |
| User | john@example.com | `Password123!` |
| User | sarah@example.com | `Password123!` |

Seeded rooms: Focus Room (4), Board Room (8), Collaboration Room (12), plus three sample bookings for tomorrow.

## API

Errors always look like `{ "error": { "code": "...", "message": "..." } }` with codes `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `BOOKING_CONFLICT`, `INTERNAL_ERROR`.

| Method and path | Who | Notes |
| --- | --- | --- |
| `POST /auth/login` | anyone | Rate limited to 10 per minute |
| `GET /auth/me` | signed in | Current user |
| `GET /rooms` | signed in | Includes `currentBooking` |
| `GET /rooms/:id/bookings?from=&to=` | signed in | ISO timestamps; bookings overlapping the window |
| `POST /rooms`, `PUT /rooms/:id`, `DELETE /rooms/:id` | admin | |
| `POST /bookings` | signed in | Body: `roomId, title, startTime, endTime`; `409 BOOKING_CONFLICT` on overlap |
| `DELETE /bookings/:id` | owner or admin | `404` if missing, `403` for someone else's booking |
| `GET/POST /users`, `DELETE /users/:id` | admin | Password hashes are never returned |
| `GET /admin/stats`, `/admin/audit-logs`, `/admin/system-logs` | admin | Paginated |

## Authentication and authorization

Login returns a signed HS256 JWT (8 hour expiry) carrying the user id and role. Passwords are hashed with bcrypt. Every route except login requires a valid token, and role checks run in the backend on every request; hiding a link in the UI is a convenience, not a control.

- **ADMIN:** everything, including users, rooms, audit and system logs, and deleting any booking.
- **USER:** view rooms and schedules, create bookings, and delete **their own** bookings only.

## Concurrency strategy

**Why a check in the API is not enough.** The obvious flow is: select bookings that overlap, and if none exist, insert. Two requests can both run the select before either inserts, both see "free", and both insert. Now the room is double booked. The gap between check and insert cannot be closed from application code.

**What actually prevents it.** The database enforces the rule in the same write that inserts the row:

- The overlap rule is `existing.start < new.end AND new.start < existing.end`, on the half-open interval `[start, end)`.
- Half-open means the end instant belongs to the next slot. So 10:00-11:00 and 11:00-12:00 do **not** conflict (back-to-back bookings are allowed), while 10:00-11:00 and 10:59-12:00 do.
- A `BEFORE INSERT` trigger on `bookings` aborts any row that overlaps an existing booking in the same room (see `backend/prisma/migrations/*_init/migration.sql`). SQLite runs one writer at a time, so the check and its insert cannot interleave with another write.
- The API still does a friendly pre-check first. That is UX only; the trigger is the guarantee.

**How the error reaches the client.** When the trigger rejects an insert, Prisma raises a constraint error. The route re-runs the overlap query to confirm it was a lost race and returns `409 BOOKING_CONFLICT` with a clean message; no database text is exposed. The frontend keeps the form values, shows "Someone else just booked this room for that time", and refreshes the schedule.

**Example.** Ana and Ben both submit Focus Room 10:00-11:00 within the same millisecond. Both pass the pre-check. Ana's insert commits; Ben's hits the trigger, the API answers `409`, and Ben sees the conflict message with his form intact. The test suite fires 10 concurrent identical requests and asserts exactly one `201`, nine `409`, and one row in the table.

**PostgreSQL note.** On PostgreSQL the same guarantee is a one-liner: `EXCLUDE USING gist (room_id WITH =, tstzrange(start_time, end_time, '[)') WITH &&)` with the `btree_gist` extension, and the loser gets SQLSTATE `23P01`. This project uses SQLite so it runs anywhere with no setup; the trigger is the SQLite equivalent.

## Testing

```bash
npm --prefix backend test          # 19 tests against tests' own SQLite file
npm --prefix backend run typecheck
npm --prefix backend run lint
npm --prefix frontend run build    # typecheck + production build
npm --prefix frontend run lint
```

Tests use `TEST_DATABASE_URL` (a separate SQLite file) and apply migrations automatically. They cover: valid booking, end before start, over 4 hours, in the past, overlap, back-to-back, different rooms, deleting a missing booking (404), ownership on delete (403), a standard user creating users (403), forged tokens, and the concurrent-request race.

## Trade-offs

Deliberately left out to keep this small: OAuth/SSO/MFA, password reset and email verification, refresh tokens, multi-tenancy, recurring bookings, notifications, calendar sync, a job queue or cache, and any state library beyond React Context. Tokens live in `localStorage` for simplicity; a production app would prefer httpOnly cookies. System logs are stored in the same database.

## Future improvements

Recurring bookings, email notifications, Google and Microsoft 365 calendar sync, time-zone-aware multi-office support, booking approval workflows, and a PostgreSQL deployment using the exclusion constraint.
