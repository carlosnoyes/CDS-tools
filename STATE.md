# Project State

> Durable memory for CDS-tools. Update this file to fight context rot across sessions.

## Current Focus

- React/Vite appointment tool in `app/` — Airtable layer dramatically restructured (2026-02-19)
- All Airtable modules now live in `app/src/airtable/`: appointments, courses, instructors, students, vehicles, client
- Constants centralized in `app/src/utils/constants.js`: `BASE_ID`, `TABLES`, `APPT_FIELDS`, `LOCATIONS`, `INSTRUCTOR_ORDER`
- Root-level `package.json`, `package-lock.json`, and all `scripts/` were deleted (moved into `app/`)
- Run: `cd app && npm run dev`

## Current Decisions

- Repository uses `main` as the default branch
- Project is in early stages; structure is being established
- Primary data store is Airtable (base: `appfmh7j77kCe8hy2`, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#airtable-base) for full schema)

## Airtable Quick Reference

| Item | Value |
|------|-------|
| Base name | Colonial Driving School - Carlos |
| Base ID | `appfmh7j77kCe8hy2` |
| API key env var | `VITE_AIRTABLE_API_KEY` (in `app/.env`) |
| Active (new) tables | Students, Courses, Services, Prices, Sales, Schedule, Instructors, Cars, Availability |
| Fully built tables | Students, Courses, Services, Prices, Schedule, Instructors, Cars, Availability |
| Stub-only tables | Sales (base 3 fields only) |
| Legacy (operational) tables | Students - Old, Courses - Old, Emails - Old |
| Template Table | `tblsF8RF9pA0ndM3P` — do not delete; source for duplicating new tables |
| Services table ID | `tbl7hzYhb2kHDE7dg` |
| Availability table ID | `tbl5db09IrQR5rmgU` — 13 fields (Record ID, Instructor, Vehicle, Status, Day of Week, Start, Shift Length, End, Notes, Repeate Until, Cadence, Created, Last Modified) |
| Note | "Appointments" table renamed to "Schedule"; "Vehicles" table renamed to "Cars"; Emails table removed from base |
| Note | All new tables duplicated from Template Table; have Record ID, Created, Last Modified by default |
| **Last synced** | 2026-02-20 |
| Full schema | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#airtable-base) |

## Availability — Schema (rebuilt 2026-02-18)

- `Status` field: "Scheduled" or "Blocked Off" (replaces old `Type` field)
- `Cadence` field: "Weekly" or "Bi-Weekly" (replaces old `Week` field)
- `Repeate Until` field: date — last date the recurrence applies (note: "Repeate" typo is in Airtable)
- Shift timing: `Start` (dateTime) + `Shift Length` (duration) => `End` (formula) — field names in Airtable are "Start"/"End", not "Shift Start"/"Shift End"
- `Day of Week`: formula field derived from `Start`, not a select
- `Vehicle` link added — Availability can be linked to a vehicle as well as an instructor
- Old `Week 1`/`Week 2` bi-weekly anchor approach may still apply in scheduling logic but is no longer encoded as a field value

## Schedule — Schema (updated 2026-02-20)

> Table renamed from "Appointments" to "Schedule" in Airtable (ID unchanged: `tblo5X0nETYrtQ6bI`). "Vehicle" link field renamed to "Car" (singular).

- Links: Student, Instructor, Car, Course (all multipleRecordLinks)
- Timing: `Start` (dateTime) + Course `Length` (lookup) + `PUDO` (duration) => `End` (formula)
- `PUDO` is a duration field (h:mm format, e.g. 0:30 or 1:00), NOT a singleSelect — duration math used in formulas
- `PUDO` is added twice (pickup + dropoff) in the End formula: `{PUDO}/60` gives minutes
- `Pickup At` and `Dropoff At` are new formula fields computing those datetimes from Start/End + PUDO
- `Location`: "CH" (Colonial Heights) or "GA" (Glen Allen) — values changed from full names to abbreviations
- `Classroom`: new singleSelect — "Class Room 1" or "Class Room 2"
- `Age`, `Tier`, `Spanish`, `PUDO` (schedule-level): new singleSelect/checkbox fields set per appointment
- Corresponding `**(from Course)**` lookup fields pull allowed values from linked course
- `Abreviation`: auto-formula combining Instructor + Student + Car + Course + Class Number
- `Canceled` (`fld4sG95vpTu5jnbk`, checkbox): whether the appointment was canceled — added 2026-02-20
- `No Show` (`fldhYZ5TjHhDI8WVy`, checkbox): whether the student was a no-show — added 2026-02-20

## Prices — Schema (updated 2026-02-19)

- Links to either Courses OR Services (mutually exclusive per record)
- `Bundled` (number): quantity of sessions included (1 = single, >1 = bundle)
- `Walk In` (checkbox): walk-in rate flag
- `Online` (checkbox): online rate flag — new field added
- `Version` and `Expires On` and `Unique Abreviation` fields were removed from the live base

## Courses — Schema (updated 2026-02-20)

- Old checkboxes (`Classroom`, `In Car`, `Online`) removed
- Now has `Type` singleSelect ("In Car" / "Classroom") instead
- Fields: `Teen Distinct` (checkbox), `Tier Options` (multipleSelects: S/EL/RL), `Location Options` (multipleSelects: CH/GA), `Spanish Offered` (checkbox), `PUDO Offered` (checkbox), `Additional Requirements` (multilineText), `Numbered` (checkbox)
- `Lookup` formula field: `{Abreviation} & " - " & {Name}` — combined display string
- Note: `Age Options` (multipleSelects T/A) was removed; replaced by `Teen Distinct` (checkbox) on the Course and `Teen` (checkbox) on Students
- Note: field is named "Location Options" (not "Locations Options") in Airtable

## Students — Schema (updated 2026-02-20)

- `Guardian Relation` (`fldbWdPSN5Nev2blX`, singleLineText) — between Guardian Last Name and Guardian Phone
- `Teen` (`fldMZsgc6M6tjSM4N`, checkbox) — between Guardian Email and Address

## Open Questions

- [ ] What language/runtime will the tools be built with?
- [ ] What is the first tool to build?
- [ ] What CI/CD platform to use?

## Next Milestones

- [ ] Define first tool and its scope
- [ ] Set up CI pipeline
- [ ] Add initial test infrastructure

## Last Verified Commands

| Command | Status | Date |
|---------|--------|------|
| `git status` | Working | 2026-02-18 |
| <!-- TODO: test command --> | <!-- TODO --> | <!-- TODO --> |
