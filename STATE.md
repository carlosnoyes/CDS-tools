# Project State

> Durable memory for CDS-tools. Update this file to fight context rot across sessions.

## Current Focus

- React/Vite appointment tool scaffolded in `app/` — Phases 1–4 complete, builds clean
- Run: `cd app && npm run dev`
- Phase 5 (loading states, delete confirm dialog, DEV_SETUP update) is next

## Current Decisions

- Repository uses `main` as the default branch
- Project is in early stages; structure is being established
- Primary data store is Airtable (base: `appfmh7j77kCe8hy2`, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#airtable-base) for full schema)

## Airtable Quick Reference

| Item | Value |
|------|-------|
| Base name | Colonial Driving School - Carlos |
| Base ID | `appfmh7j77kCe8hy2` |
| API key env var | `AIRTABLE_API_KEY` |
| Active (new) tables | Students, Courses, Services, Prices, Sales, Appointments, Instructors, Vehicles, Availability, Emails |
| Fully built tables | Students, Courses, Services, Prices, Appointments, Instructors, Vehicles, Availability |
| Stub-only tables | Sales, Emails (base 3 fields only) |
| Legacy (operational) tables | Students - Old, Courses - Old, Emails - Old |
| Template Table | `tblsF8RF9pA0ndM3P` — do not delete; source for duplicating new tables |
| Services table ID | `tbl7hzYhb2kHDE7dg` — new table, not previously documented |
| Availability table ID | `tbl5db09IrQR5rmgU` — rebuilt (13 fields: Record ID, Instructor, Vehicle, Status, Day of Week, Shift Start, Shift Length, Shift End, Notes, Repeat Until, Cadence, Created, Last Modified) |
| Note | All new tables duplicated from Template Table; have Record ID, Created, Last Modified by default |
| Full schema | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#airtable-base) |

## Availability — Schema (rebuilt 2026-02-18)

- `Status` field: "Scheduled" or "Blocked Off" (replaces old `Type` field)
- `Cadence` field: "Weekly" or "Bi-Weekly" (replaces old `Week` field)
- `Repeate Until` field: date — last date the recurrence applies (note: "Repeate" typo is in Airtable)
- Shift timing: `Start` (dateTime) + `Shift Length` (duration) => `End` (formula) — field names in Airtable are "Start"/"End", not "Shift Start"/"Shift End"
- `Day of Week`: formula field derived from `Start`, not a select
- `Vehicle` link added — Availability can be linked to a vehicle as well as an instructor
- Old `Week 1`/`Week 2` bi-weekly anchor approach may still apply in scheduling logic but is no longer encoded as a field value

## Appointments — Schema (built out 2026-02-18)

- Links: Student, Instructor, Vehicle, Course (all multipleRecordLinks)
- Timing: `Start` (dateTime) + Course `Length` + `PUDU` (pick-up/drop-off duration) => `End` (formula)
- `PUDU` duration is added twice (once each way) in the End formula
- `Class Number`: sequential number within student's enrollment
- `Location`: "Colonial Heights" or "Glen Allen"
- `Abreviation`: auto-formula combining linked record abbreviations + Class Number

## Prices — Schema (built out 2026-02-18)

- Links to either Courses OR Services (mutually exclusive per record)
- `Bundled` (number): quantity of sessions included (1 = single, >1 = bundle)
- `Walk In` (checkbox): walk-in rate flag
- `Version` (number): tracks price history; `Unique Abreviation` = abbrev + version
- `Expires On` (date): price expiration

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
