# Project State

> Durable memory for CDS-tools. Update this file to fight context rot across sessions.

## Current Focus

- React/Vite appointment scheduling tool in `app/` — fully built through Phase 27
- Four views: Calendar, Table, Students, Availability
- Run: `cd app && npm run dev`
- **Next work:** Phase 20 — Scoped Block Off Overrides (Instructor-Only / Car-Only)

## App Structure

```
app/src/
  pages/         CalendarPage, TablePage, StudentsPage, AvailabilityPage
  components/
    layout/      AppShell (nav tabs)
    calendar/    WeekCalendar, CalendarGrid, DayColumn, DayPopout, AppointmentBlock,
                 AvailabilityOverlay, TimeGutter, WeekNav
    form/        AppointmentForm, AppointmentModal, AppointmentSidebar,
                 LinkedSelect, DeleteButton
    table/       AppointmentTable, TableFilters
    students/    StudentForm
    availability/ AvailabilityForm, AvailabilityGrid, AvailabilityBlock,
                  AvailabilitySidebar, AvailabilityToolbar, ResourceColumn,
                  BlockShortcutDialog
    ui/          shadcn components (button, dialog, table, select, input, label, badge, sonner)
  airtable/      client.js, appointments.js, courses.js, instructors.js,
                 students.js, vehicles.js, availability.js
  hooks/         useAppointments.js, useReferenceData.js, useAvailability.js,
                 useAvailabilityMutations.js
  utils/         constants.js, colors.js, time.js, overlap.js, conflicts.js,
                 availability.js, availabilityView.js
  lib/           utils.js (shadcn)
```

## Current Decisions

- Repository uses `main` as the default branch
- Primary data store is Airtable (base: `appfmh7j77kCe8hy2`)
- No backend server — Airtable API called directly from browser
- API key in `app/.env` as `VITE_AIRTABLE_API_KEY`

## Airtable Quick Reference

| Item | Value |
|------|-------|
| Base name | Colonial Driving School - Carlos |
| Base ID | `appfmh7j77kCe8hy2` |
| API key env var | `VITE_AIRTABLE_API_KEY` (in `app/.env`) |
| Active tables | Schedule, Courses, Students, Instructors, Cars, Availability, Services, Prices, Sales |
| Legacy tables | Students - Old, Courses - Old, Emails - Old |
| Template Table | `tblsF8RF9pA0ndM3P` — do not delete |
| **Last synced** | 2026-02-21 (live API) |
| Full schema | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#airtable-base) |

## Table IDs

| Table | ID |
|-------|----|
| Schedule | `tblo5X0nETYrtQ6bI` |
| Courses | `tblthPfZN6r0FCD9P` |
| Students | `tblpG4IVPaS8tq4bp` |
| Instructors | `tblwm92MbaoRT2dSa` |
| Cars | `tblog7VBOinu5eVqp` |
| Availability | `tbl5db09IrQR5rmgU` |
| Services | `tbl7hzYhb2kHDE7dg` |
| Prices | `tblDZMwgA9Ay0JbRA` |
| Sales | `tbl0aRT60VhcLq06G` |

## Schema Notes (verified 2026-02-21)

### Instructors
- `Spanish` (`fldd71WcnVHnEp6tP`, checkbox) — whether instructor is Spanish-capable
- `Tiers` (`fldk75KnmivXoYgm9`, multipleSelects) — capability tiers (EL, RL, etc.)
- **Note:** `Capabilities` multipleSelect field is gone — replaced by separate `Spanish` and `Tiers` fields

### Availability
- `Location` (`fld3hPPZq6RjQfEHo`, singleSelect) — "CH" or "GA"
- `Status` ("Scheduled" / "Blocked Off"), `Cadence` ("Weekly" / "Bi-Weekly")
- `Repeate Until` — typo is baked into Airtable
- `Start` + `Shift Length` + `End` (formula) — not "Shift Start"/"Shift End"

### Schedule
- `Canceled` (`fld4sG95vpTu5jnbk`, checkbox), `No Show` (`fldhYZ5TjHhDI8WVy`, checkbox)
- `PUDO` stored as seconds (1800 = 30 min, 3600 = 60 min)
- `Location`: "CH" or "GA" (abbreviated, not full names)
- `Classroom`: "Class Room 1" or "Class Room 2"
- `Car` link field (singular) — not "Vehicle"

### Field Name Typos Baked into Airtable
- `"Abreviation"` (not Abbreviation) — on Schedule, Courses, Services, Prices
- `"Repeate Until"` (not Repeat) — on Availability
- `"Serivces Abreviation"` (not Services) — on Prices

## Key Constants (`app/src/utils/constants.js`)

- `BASE_ID`, `TABLES` — all table IDs
- `APPT_FIELDS` — Schedule field IDs (writable + read-only clearly labeled)
- `STUDENT_FIELDS` — Students field IDs
- `AVAIL_FIELDS` — Availability field names (stored by name, not ID)
- `INSTRUCTOR_ORDER` — stable instructor record ID array for color assignment
- `LOCATION_LABELS` — `{ CH: "Colonial Heights", GA: "Glen Allen" }`
- `CLASSROOMS` — `["Class Room 1", "Class Room 2"]`
- `PUDO_OPTIONS` — `["0:30", "1:00"]`

## Last Verified Commands

| Command | Status | Date |
|---------|--------|------|
| `cd app && npm run dev` | Working | 2026-02-21 |
