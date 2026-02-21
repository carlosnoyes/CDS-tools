# Plan — CDS Appointment Tool

> Active plan. Completed phases have been removed. Update checkboxes as work progresses.

## Context

React/Vite web app in `app/` — talks to Airtable directly from the browser. Phases 1–27 are complete. The app has four views: Calendar, Table, Students, Availability.

**Run:** `cd app && npm run dev`

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

## Non-Goals

- No backend server / proxy — API calls go direct to Airtable from browser
- No authentication layer (internal tool)
- No mobile-first design (desktop-first)

---

## Phase 1 — Airtable Schema Changes for Availability Redesign

The Availability table (`tbl5db09IrQR5rmgU`) needs one new field. Existing fields `Cadence`, `Repeate Until`, and `Day of Week` are no longer used by the new model (individual records instead of recurrence-on-read) but should be left in Airtable — no deletions.

- [x] Add `Classroom` field to Availability table — singleSelect with options `"Class Room 1"`, `"Class Room 2"` (field ID: `fld7YPZifR1Hn21EB`)
- [x] Update `AVAIL_FIELDS` in `app/src/utils/constants.js` to include `Classroom` and `Notes`
- [x] Update `docs/ARCHITECTURE.md` Availability table schema to include the new `Classroom` field and its field ID
- [x] Migrate existing recurrence-based records: expanded 31 weekly records into 1,576 standalone records through 2026-12-31; cleared `Cadence`/`Repeate Until` on all originals (scripts in `scripts/`)

## Phase 2 — Availability Data Layer Refactor

Refactor `expandAvailability()` and the availability fetch/mutation hooks to work with standalone records (no recurrence expansion on read).

- [x] Update `app/src/utils/availability.js` → `expandAvailability()`: removed recurrence expansion; uses `isSameDay` date matching; includes source `record` on intervals
- [x] Preserve `Blocked Off` scope-matching rules (instructor-only, vehicle-only, instructor+vehicle, both-blank=ignored)
- [x] Preserve blocked-interval subtraction/splitting logic
- [x] Update `app/src/airtable/availability.js` fetch to include `Classroom` and `Notes` fields (automatic via AVAIL_FIELDS)
- [x] Update `app/src/hooks/useAvailabilityMutations.js`:
  - [x] Add recurrence expansion on create (`useBulkCreateAvailability`)
  - [x] Add "All Future Shifts" bulk edit (`useBulkUpdateAvailability`)
  - [x] Add "All Future Shifts" bulk delete (`useBulkDeleteAvailability`)
  - [x] Add split mutation (`useSplitAvailability`)
- [ ] Verify Calendar view's availability overlay still renders correctly with the new data model

## Phase 3 — Availability View: Calendar-Style Layout

Replace the current Availability view (Recurring/Week mode grid) with the Calendar-style year-scroll layout.

- [x] Refactor `app/src/pages/AvailabilityPage.jsx` to reuse Calendar's year-scroll grid, nav bar, Today button, date picker
- [x] Reuse `CalendarGrid`, `DayColumn`, `TimeGutter`, `WeekNav` components via props (`hideAppointments`, `onClickAvailability`)
- [x] Reuse axis zoom (drag-to-resize columns/gutter, scroll-wheel zoom)
- [x] Reuse day popout (double-click day header)
- [x] Render only availability blocks (no appointment blocks) via `hideAppointments` prop
- [x] By Car lane layout: same rules as Calendar (unchanged — DayColumn reused as-is)
- [ ] Remove old `AvailabilityGrid`, `AvailabilityBlock`, `AvailabilityToolbar`, `ResourceColumn` components (dead code cleanup)
- [x] Click empty slot → open Add Availability sidebar
- [x] Click availability block → open Edit Availability sidebar (via `onClickAvailability` prop chain)

## Phase 4 — Add Availability Form (Sidebar)

Build the Add Availability form as a sidebar (same pattern as Calendar's appointment sidebar).

- [x] Repurposed existing `AvailabilityForm` with new fields
- [x] Fields: Start date/time, End time, Instructor, Car, Classroom, Location, Note, Recurrence, End Date
- [x] Pre-fill from click context: date, start time (snapped to hour), end time (start + 8h or end of day)
- [x] End Date validation: cannot exceed 1 year from Start; required when Recurrence ≠ None
- [x] On save: expand recurrence into individual records via `useBulkCreateAvailability`
- [x] Toast shows count on success (e.g., "Created 12 shifts")
- [x] Invalidate availability cache on success

## Phase 5 — Edit Availability Form (Sidebar)

Build the Edit Availability form as a sidebar with scope toggle, delete, and split.

- [x] Create `AvailabilityEditForm` component (or repurpose existing `AvailabilityForm`)
- [x] Pre-fill all fields from clicked record
- [x] Scope toggle: "Single Shift" / "All Future Shifts" segmented control at top
- [x] Series matching logic: same Instructor + same Car/Classroom + same time-of-day + same day-of-week + date ≥ selected record's date
- [x] Show count of affected records when "All Future Shifts" is selected ("This will update N shifts")
- [x] Edit fields: Start time, End time, Instructor, Car, Classroom, Note
- [x] In "All Future Shifts" mode: date changes disabled (only time-of-day, instructor, car, classroom, note)
- [x] Delete button in header — respects scope toggle; confirmation dialog shows count
- [x] Split button in footer:
  - [x] Time picker: "Split at what time?" — must be strictly between Start and End
  - [x] On confirm: PATCH original (shorten End), POST new record (Start = split time, End = original End, copy all other fields)
  - [x] Split always operates on single record (ignores scope toggle)
- [x] Invalidate availability cache on any mutation

## Phase 6 — Scoped Block Off Overrides

Update `expandAvailability()` to support `Blocked Off` scope matching rules (carried over from old Phase 1):

- [ ] Instructor + Vehicle set: subtract only matching instructor+vehicle intervals
- [ ] Instructor only: subtract from all scheduled intervals for that instructor (any vehicle)
- [ ] Vehicle only: subtract from all scheduled intervals for that vehicle (any instructor)
- [ ] Both blank: ignore (no-op)
- [ ] Update W1/W2/W3 warning computation in `conflicts.js` to align with scoped block-off results
- [ ] Manual QA: create instructor-only and vehicle-only blocks, verify correct lane removal

## Phase 7 — Manual QA & Cleanup

- [ ] Manual QA: appointment block tooltip lines/ordering (carried over)
- [ ] Manual QA: drag-to-resize vertical zoom (carried over)
- [ ] Manual QA: Availability view end-to-end — add, edit single, edit all future, delete single, delete all future, split
- [ ] Manual QA: Calendar overlay renders correctly with standalone availability records
- [ ] Update `docs/DEV_SETUP.md` with app setup instructions

---

## Constraints

- Airtable API key goes in `app/.env` as `VITE_AIRTABLE_API_KEY`
- Write operations: linked record fields expect `[recordId]` array; PUDO stored as seconds; Start as ISO 8601 Eastern offset; formula fields are read-only
- Field name typos baked into Airtable: `"Abreviation"`, `"Repeate Until"`, `"Serivces Abreviation"`
- All code lives in `app/`
- Availability records: `Shift Length` stored as seconds; `End` is a formula field (read-only); `Cadence`/`Repeate Until`/`Day of Week` fields remain in Airtable but are no longer written by the app

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Airtable rate limits (5 req/sec) | Medium | Recurrence expansion can create many records at once; batch POSTs and throttle to stay under limit |
| Bulk create/edit/delete hitting rate limits | Medium | Throttle parallel requests (max 4-5 concurrent); show progress indicator |
| "All Future Shifts" matching false positives | Low | Strict matching criteria (instructor + car + time + day-of-week); show preview count before applying |
| Migration of existing recurrence records | Low | One-time operation; can be done manually or via script; old fields left in place as fallback |
| API key visible in browser bundle | Low | Internal tool only; acceptable tradeoff |
