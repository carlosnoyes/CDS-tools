# Plan — CDS Appointment Tool (React Web App)

> Agreed plan for building the appointment management UI. Update checkboxes as work progresses.

## Context

CDS needs a web UI to view and manage driving appointments stored in Airtable. The repo currently has only Node.js data scripts. This plan adds a React/Vite app in `app/` that talks to Airtable directly from the browser.

## Goals

- [ ] Table view of all appointments (sortable, filterable)
- [ ] Add / Edit appointment form (all fields, dropdowns for linked records)
- [ ] Calendar week view (Mon–Sun columns, time-of-day rows, colored by instructor)

## Non-Goals

- No backend server / proxy — API calls go direct to Airtable from browser
- No authentication layer (internal tool)
- No mobile-first design (desktop-first)
- No other tables (Students, Availability, etc.) in this phase

## Tech Stack

| Role | Choice |
|------|--------|
| Build | Vite + React 18 |
| Routing | React Router v6 |
| Data fetching | TanStack Query v5 |
| UI components | shadcn/ui + Tailwind CSS |
| Forms | React Hook Form |
| Dates | date-fns |
| Calendar | Custom CSS Grid |

## Phased Plan

### Phase 1 — Scaffold + Data Layer
- [ ] `npm create vite@latest app -- --template react`
- [ ] Install: `react-router-dom @tanstack/react-query date-fns`
- [ ] Install and init shadcn/ui + Tailwind
- [ ] `app/src/utils/constants.js` — all table IDs and field IDs
- [ ] `app/src/airtable/client.js` — GET/POST/PATCH fetch wrapper
- [ ] `app/src/airtable/` — 5 table modules (appointments, students, instructors, vehicles, courses)
- [ ] `app/src/hooks/useReferenceData.js` — parallel fetch, builds lookup maps
- [ ] `app/src/hooks/useAppointments.js` — week-scoped query
- [ ] Smoke-test: verify data loads in browser devtools

### Phase 2 — Table View
- [ ] `AppShell` with nav tabs (Calendar | Table)
- [ ] `AppointmentTable` — shadcn Table, resolve names from reference maps, sortable columns
- [ ] `TableFilters` — filter by instructor, location
- [ ] Route `/table`

### Phase 3 — Add / Edit Form
- [ ] `AppointmentModal` (shadcn Dialog, create vs edit mode)
- [ ] `AppointmentForm` with React Hook Form
- [ ] `LinkedSelect` reusable dropdown component
- [ ] Create path: POST → invalidate cache
- [ ] Edit path: pre-fill from record → PATCH → invalidate
- [ ] "New Appointment" button

### Phase 4 — Calendar Week View
- [ ] `WeekNav` (prev / next / today, Monday-anchored week)
- [ ] `WeekCalendar` CSS grid + overlap resolver
- [ ] `TimeGutter` (6 AM – 9 PM)
- [ ] `DayColumn` + `AppointmentBlock` (positioned by time math, instructor color)
- [ ] Click block → edit modal; click empty space → create modal with time pre-filled
- [ ] Route `/` (default)

### Phase 5 — Polish
- [ ] Loading skeletons + error toasts (`Sonner`)
- [ ] Delete confirmation dialog
- [ ] Update `docs/DEV_SETUP.md` with app setup
- [ ] Add `app:dev` npm script to root `package.json`

## Constraints

- Airtable API key goes in `app/.env` as `VITE_AIRTABLE_API_KEY` (Vite prefix required for browser exposure)
- Write operations: linked record fields expect `[recordId]` array format; PUDU stored as seconds; Start as ISO 8601 with Eastern offset; formula fields are read-only
- Field name typos are baked into Airtable: `"Abreviation"` (not Abbreviation), `"PUDU"` for pickup/dropoff duration
- All new code lives in `app/` — existing `scripts/` and root `package.json` are untouched

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| CORS on direct Airtable API calls from browser | Low | Airtable REST API supports browser CORS with Bearer token |
| API key visible in browser bundle | Low | Internal tool only; acceptable tradeoff vs backend complexity |
| Overlapping appointments hard to render | Medium | Overlap resolver algorithm in Phase 4; fallback is simple offset |
| Airtable rate limits (5 req/sec) | Low | Reference data cached 30 min; appointments cached 2 min |

## Verification

- Phase 1: Reference data and appointments log in browser devtools
- Phase 2: All mock appointments visible, sort/filter works
- Phase 3: Create appt → appears in Airtable web UI; edit → persists
- Phase 4: Appointments on correct day/time, instructor colors consistent
- Phase 5: No console errors; error state on missing API key

## Rollback

All new code is in `app/` (new directory). To roll back, delete `app/`. Nothing in the existing repo is modified until Phase 5.
