---
name: room-booking-phase1
description: Phase 1 scaffold for the Room Booking App monorepo — Go + PostgreSQL + sqlc + Turborepo
type: project
---

Phase 1 of the Room Booking App was completed on 2026-03-15. All files scaffolded at `room-booking/`.

**Why:** Full-stack room booking system for ~50 rooms / 500 users. Backend: Go (chi, pgx/v5, sqlc, golang-migrate). Frontend (future phases): TanStack Start. Monorepo: Turborepo + pnpm workspaces.

**Approved Architecture Decisions:**
- D1: All forward-known columns included in P1 migrations (no ALTER TABLE in later phases)
- D2: Room deletion = MAINTENANCE status (no deleted_at)
- D3: Hybrid migrations — auto-migrate on startup in dev (AUTO_MIGRATE=true), CLI for prod
- D4: updated_at TIMESTAMPTZ on users, rooms, bookings
- D5: 7 additional sqlc queries added (UpsertUserByGoogleID, UpdateUserRole, BatchCompleteExpired, BatchNoShow, ListUpcomingReminders, SetGCalEventID, CountBookingsByRoomForAnalytics)
- D6: booking_time_order CHECK (end_time > start_time)

**Key paths:**
- Go module: `apps/api/` — module path `github.com/company/room-booking`
- Migrations: `apps/api/migrations/` (001–004)
- sqlc queries: `apps/api/sqlc/queries/`
- Config: `apps/api/internal/config/config.go`
- DB pool: `apps/api/internal/db/pool.go`
- Server: `apps/api/cmd/server/main.go`

**How to apply:** When continuing with Phase 2+, the sqlc-generated files will live in `apps/api/internal/db/`. Do not manually create them — run `sqlc generate`. The internal/db/ directory is gitignored for generated files.
