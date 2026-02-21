# Architecture

> System overview for CDS-tools. Last updated: 2026-02-21.

## Goals

- Provide a web UI for CDS staff to manage driving school appointments
- Expose instructor availability, student records, and scheduling in one place

## Non-Goals

- No backend server / proxy — API calls go direct to Airtable from browser
- No authentication layer (internal tool)
- No mobile-first design (desktop-first)

## High-Level Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                        CDS-tools / app/                            │
│                                                                    │
│  Pages: Calendar | Table | Students | Availability                 │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  React Components (pages/, components/)                     │   │
│  │    calendar/  form/  table/  students/  availability/  ui/  │   │
│  └─────────────────────────────┬───────────────────────────────┘   │
│                                │                                    │
│  ┌─────────────────────────────▼───────────────────────────────┐   │
│  │  Hooks (hooks/)                                             │   │
│  │    useAppointments  useReferenceData  useAvailability        │   │
│  │    useAvailabilityMutations                                  │   │
│  └─────────────────────────────┬───────────────────────────────┘   │
│                                │                                    │
│  ┌─────────────────────────────▼───────────────────────────────┐   │
│  │  Airtable modules (airtable/)                               │   │
│  │    appointments  courses  instructors  students              │   │
│  │    vehicles  availability  client                            │   │
│  └─────────────────────────────┬───────────────────────────────┘   │
│                                │                                    │
│  ┌─────────────────────────────▼───────────────────────────────┐   │
│  │  Utils (utils/)                                             │   │
│  │    constants  colors  time  overlap  conflicts               │   │
│  │    availability  availabilityView                            │   │
│  └─────────────────────────────┬───────────────────────────────┘   │
└────────────────────────────────┼───────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   Airtable REST API    │
                    │   base: appfmh7j77kCe8hy2  │
                    └────────────────────────┘
```

## Key Modules

### App (`app/`)

React/Vite frontend — appointment scheduling tool.

**Run:** `cd app && npm run dev`

| Module | Location | Purpose |
|--------|----------|---------|
| Airtable client | `app/src/airtable/client.js` | Thin fetch wrapper — handles auth, pagination, CRUD, errors |
| Appointments | `app/src/airtable/appointments.js` | Fetch (date-range scoped), create, update, delete schedule records |
| Courses | `app/src/airtable/courses.js` | Fetch all courses (Abbreviation, Name, Lookup, Length, Type, options) |
| Instructors | `app/src/airtable/instructors.js` | Fetch all instructors (Full Name, Spanish checkbox, Tiers multiselect, Role) |
| Students | `app/src/airtable/students.js` | Fetch, create, update, delete students |
| Vehicles | `app/src/airtable/vehicles.js` | Fetch all cars (Car Name) |
| Availability | `app/src/airtable/availability.js` | Fetch, create, update, delete availability records |
| Constants | `app/src/utils/constants.js` | `BASE_ID`, `TABLES`, `APPT_FIELDS`, `STUDENT_FIELDS`, `AVAIL_FIELDS`, `INSTRUCTOR_ORDER` |
| Colors | `app/src/utils/colors.js` | Instructor color assignment (stable by `INSTRUCTOR_ORDER`) |
| Time | `app/src/utils/time.js` | Date/time helpers (DAY_START_HOUR = 8 AM) |
| Overlap | `app/src/utils/overlap.js` | Appointment overlap detection / sub-cluster algorithm |
| Conflicts | `app/src/utils/conflicts.js` | Conflict (E1–E5) and warning (W1–W6) checks |
| Availability util | `app/src/utils/availability.js` | `expandAvailability()` — expands recurrences, subtracts block-offs |
| Availability view | `app/src/utils/availabilityView.js` | `buildRecurringBlocks()`, `buildWeekBlocks()` for Availability page |

### Routes

| Path | Page | Description |
|------|------|-------------|
| `/` | CalendarPage | Year-scroll calendar, By Car lane layout, availability overlay |
| `/table` | TablePage | Date-range appointment table with sort/filter |
| `/students` | StudentsPage | Student table with search + sidebar CRUD form |
| `/availability` | AvailabilityPage | Recurring / Week View availability grid |

### Design Patterns

- All Airtable modules import table IDs from `constants.js` — never hardcoded inline
- Formula and lookup fields are **read-only** — only writable fields are passed to create/update
- `APPT_FIELDS` maps semantic names to Airtable field IDs (writable and read-only clearly labeled)
- `AVAIL_FIELDS` uses field **names** (not IDs) because availability is queried by name
- Appointments cached 2 min; reference data (instructors, courses, cars, students) cached 30 min

## Data Flow

```
User Action
  → React Component
    → Hook (useAppointments / useReferenceData / useAvailability)
      → TanStack Query (cache + invalidation)
        → airtable/*.js module
          → client.js (fetch wrapper: auth, pagination, error handling)
            → Airtable REST API (base: appfmh7j77kCe8hy2)
```

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
| Notifications | Sonner (toast) |

## Key Dependencies

| Dependency | Purpose |
|------------|---------|
| Airtable | Primary data store (see below) |
| React + Vite | Frontend framework |
| TanStack Query | Data fetching, caching, mutation |
| shadcn/ui + Tailwind | Component library |
| React Hook Form | Form state, validation |
| date-fns | Date utilities |
| Sonner | Toast notifications |

---

## Airtable Base

**Base:** Colonial Driving School - Carlos
**Base ID:** `appfmh7j77kCe8hy2`
**API Key env var:** `VITE_AIRTABLE_API_KEY` (in `app/.env`)
**Last synced:** 2026-02-21 (live API)

### Tables

All new tables were duplicated from **Template Table** and share 3 base fields: `Record ID` (formula), `Created` (formula/createdTime), `Last Modified` (formula/lastModifiedTime).

| Table | ID | Status | Purpose |
|-------|----|--------|---------|
| Schedule | `tblo5X0nETYrtQ6bI` | Active | Appointment scheduling (formerly "Appointments") |
| Courses | `tblthPfZN6r0FCD9P` | Active | Course catalog |
| Students | `tblpG4IVPaS8tq4bp` | Active | Student records |
| Instructors | `tblwm92MbaoRT2dSa` | Active | Instructor records |
| Cars | `tblog7VBOinu5eVqp` | Active | Vehicle tracking (formerly "Vehicles") |
| Availability | `tbl5db09IrQR5rmgU` | Active | Instructor/car availability and blockouts |
| Services | `tbl7hzYhb2kHDE7dg` | Active | Services catalog |
| Prices | `tblDZMwgA9Ay0JbRA` | Active | Pricing (links to Courses or Services) |
| Sales | `tbl0aRT60VhcLq06G` | Stub | Sales tracking — only base 3 fields |
| Template Table | `tblsF8RF9pA0ndM3P` | Reference | Source template — do not delete |
| Students - Old | `tblzt3omoGVGSfWTj` | Legacy | Current operational student records |
| Courses - Old | `tblQbKtjmfN4RN28r` | Legacy | Current operational course catalog |
| Emails - Old | `tblIb0hJ8uF0FcUGP` | Legacy | Email templates (no longer in active use) |

### Key Relationships

| From | Field | To | Inverse Field |
|------|-------|----|---------------|
| Students | Appointments (`fldcMrrWus0qxba8i`) | Schedule | Student (`fldSGS6xsegcdEklh`) |
| Instructors | Appointments (`fldiMi2l98HdCCHAW`) | Schedule | Instructor (`fldtQT4tfTJ5FCm9T`) |
| Instructors | Availability (`fldRTIb0HtZyZuhsL`) | Availability | Instructor (`fldUao9vyLTkkqAsh`) |
| Cars | Appointments (`fldeQixDezXKvJc9F`) | Schedule | Car (`fldPRZoDW0yAe2YwQ`) |
| Cars | Availability (`fld8BXNxmFXw77aZZ`) | Availability | Vehicle (`fld6xoS3XDdBdX3Qd`) |
| Courses | Appointments (`fldtOvjel2szfdL5o`) | Schedule | Course (`fldy84c9JSS2ris1w`) |
| Courses | Prices (`fldzJJrWfRxAhTyec`) | Prices | Course Abreviation (`fldUbYGgKQqADUDSU`) |
| Services | Prices (`fldRgo9irNEs8NwFR`) | Prices | Serivces Abreviation (`fldwNUHM1sjEiZTo4`) |

---

### Schedule Fields

> Table was formerly named "Appointments". Table ID unchanged: `tblo5X0nETYrtQ6bI`.

| Field | ID | Type | Notes |
|-------|----|------|-------|
| Abreviation | `fldSsrlgL0Fhx6Ci4` | formula | Instructor + Student + Car + Course + Class Number — read only |
| Student | `fldSGS6xsegcdEklh` | multipleRecordLinks | Links to Students |
| Course | `fldy84c9JSS2ris1w` | multipleRecordLinks | Links to Courses |
| Name (from Course) | `fldUeLt9UGlCM2L46` | multipleLookupValues | Read only |
| Instructor | `fldtQT4tfTJ5FCm9T` | multipleRecordLinks | Links to Instructors |
| Type (from Course) | `fldGxc1NcZ2YaII67` | multipleLookupValues | "In Car" / "Classroom" — read only |
| Car | `fldPRZoDW0yAe2YwQ` | multipleRecordLinks | Links to Cars |
| Classroom | `flduE85AAa1DBFLtv` | singleSelect | "Class Room 1" (`selIjC2WTOnLTrk8z`), "Class Room 2" (`sel1YzU4ymsGzlIIP`) |
| Locations Options (from Course) | `fldxfTefJ4xSiSU4O` | multipleLookupValues | Read only |
| Location | `fldkQZ5XXOZTqXPlm` | singleSelect | "CH" (`selPdzvazKRfWYRRL`) = Colonial Heights, "GA" (`selUXvKoLoACASQYG`) = Glen Allen |
| Teen Distinct (from Course) | `fld9fUgLPziU5WiUb` | multipleLookupValues | Read only |
| Teen (from Student) | `fld8RazTycpbX2dbz` | multipleLookupValues | Read only |
| Age | `fldhdQS61vRqqbVJc` | singleSelect | "T" (`sel9nKw5tnRPpY8qC`) = Teen, "A" (`selC4gRIi0It7DRqO`) = Adult |
| Tier Options (from Course) | `fldVFu0EN6v19tSPZ` | multipleLookupValues | Read only |
| Tier | `fldWMcjKhn1y7INxi` | singleSelect | "EL" (`selsRh2uHNRU15pIF`), "RL" (`selj5NjQlGb5U3bSh`) |
| Spanish Offered (from Course) | `fldj52kkWsaDd1pyy` | multipleLookupValues | Read only |
| Spanish | `fld17lzRvlLbFdUa4` | checkbox | Whether appointment is in Spanish |
| PUDO Offered (from Course) | `fldKi9AiTLgUj9cYL` | multipleLookupValues | Read only |
| PUDO | `fld6nShioyE8NGlKH` | duration | Pickup/dropoff duration in seconds (1800=30min, 3600=60min) |
| Start | `fldSEIbrQiwpMhwB4` | dateTime | America/New_York, 12hr |
| Pickup At | `fldOFlvxOnqvJAYEz` | formula | Start + PUDO — read only |
| Length (from Course) | `fldv3IBKE2TiYhAhX` | multipleLookupValues | Read only |
| Dropoff At | `fldsPG5OdcFDuleX1` | formula | End − PUDO — read only |
| End | `fldA4Cct6GbdTJf9v` | formula | Start + Length + 2×PUDO — read only |
| Class Number | `fldw5sIWilBYqwQdl` | number | Sequential class number (chronological, excludes canceled/no-show) |
| Notes | `fldwDBhLucKlzEiMu` | singleLineText | |
| Canceled | `fld4sG95vpTu5jnbk` | checkbox | Appointment was canceled |
| No Show | `fldhYZ5TjHhDI8WVy` | checkbox | Student was a no-show |
| Record ID | `fldlXk1OUtz0S8ghl` | formula | Read only |
| Created | `fldanniRebdEOza0d` | formula | Read only |
| Last Modified | `fldCKn1xYAQ8BBnve` | formula | Read only |

---

### Courses Fields

| Field | ID | Type | Notes |
|-------|----|------|-------|
| Abreviation | `fldHUdk9ITWQ6mSiV` | singleLineText | Short code — primary field (typo in name) |
| Name | `fldCWflJhm4TpgzaI` | singleLineText | Full course name |
| Lookup | `fldBxYhZAsHZ5Tn7G` | formula | `{Abreviation} & " - " & {Name}` — read only |
| Length | `fldzZ2kJsZPEi2dfr` | duration | h:mm format |
| Teen Distinct | `fldLzun9hEN0jzWQE` | checkbox | Whether course is teen-specific |
| Tier Options | `flduTGL79ThCqoHBH` | multipleSelects | "S" (`seloOQYDki8VoBLqC`), "EL" (`selpnEd6wU74Rv1zt`), "RL" (`selIJN8rLl7GKYcCJ`) |
| Location Options | `fldHv3fV08Vq5uyc8` | multipleSelects | "CH" (`selnomAuRRV5fsE6R`), "GA" (`selgVKmnhhoUZYonU`) |
| Spanish Offered | `fld7UztUuJefSRKeQ` | checkbox | |
| PUDO Offered | `fld4S7xmH4bmZ0su5` | checkbox | |
| Numbered | `fldQVeK9SiReYNBmn` | checkbox | Whether appointments use class numbering |
| Additional Requirements | `fldoL83911YET3o6C` | multilineText | |
| Type | `fldldJ1rrd6dsaqRC` | singleSelect | "In Car" (`sel1YgWAIaKJ5JF05`), "Classroom" (`sel8NCA25JWV1aXTB`) |
| Prices | `fldzJJrWfRxAhTyec` | multipleRecordLinks | Links to Prices |
| Appointments | `fldtOvjel2szfdL5o` | multipleRecordLinks | Links to Schedule |
| Record ID | `fldq9cgq3G2z4UNfs` | formula | Read only |
| Created | `fldfzfxtnoGd0lHYk` | formula | Read only |
| Last Modified | `fldHWfg97NjHNnUtl` | formula | Read only |

---

### Students Fields

| Field | ID | Type | Notes |
|-------|----|------|-------|
| Full Name | `fldWUXq0QsdYjc1Jt` | formula | `{First Name} & " " & {Last Name}` — read only |
| First Name | `fldAyjsGGXkg72xfC` | singleLineText | |
| Last Name | `fldAb8QMpEQI7INWU` | singleLineText | |
| Phone | `fldC7mwK6qHNlJojs` | phoneNumber | |
| Email | `fldGLUgpK7OhK09hf` | email | |
| Guardian First Name | `fld1MkpVvhEpNM5Yx` | singleLineText | |
| Guardian Last Name | `fldil8hf91KCEJiw4` | singleLineText | |
| Guardian Relation | `fldbWdPSN5Nev2blX` | singleLineText | Relationship of guardian to student |
| Guardian Phone | `fld6WORo9bVhoV0Js` | phoneNumber | |
| Guardian Email | `fldVn5HpMzAIi1a13` | email | |
| Teen | `fldMZsgc6M6tjSM4N` | checkbox | Whether student is a teen |
| Address | `fldf1aK38wvLlWi0o` | singleLineText | |
| Appointments | `fldcMrrWus0qxba8i` | multipleRecordLinks | Links to Schedule — read only |
| Record ID | `fld4T1EeyMJhy5PdE` | formula | Read only |
| Created | `fldXMa8koP1LCwQZj` | createdTime | Read only |
| Last Modified | `fldYo3mtE2C4ElMyO` | lastModifiedTime | Read only |

---

### Instructors Fields

**Last verified:** 2026-02-21 (live API)

| Field | ID | Type | Notes |
|-------|----|------|-------|
| Full Name | `fldKw9WxSgHttxyAC` | formula | `{First Name} & " " & {Last Name}` — read only |
| First Name | `fld8ZEXvgtSpt0918` | singleLineText | |
| Last Name | `fldWq6NUn5452RrVb` | singleLineText | |
| Spanish | `fldd71WcnVHnEp6tP` | checkbox | Whether instructor is Spanish-capable |
| Tiers | `fldk75KnmivXoYgm9` | multipleSelects | Capability tiers (e.g. EL, RL) |
| Role | `fldgm6vIgy9h7D2zB` | multipleSelects | "Instructor", "Office Admin", "Sales Staff" |
| Availability | `fldRTIb0HtZyZuhsL` | multipleRecordLinks | Links to Availability |
| Record ID | `fldtew3drKZqiknYN` | formula | Read only |
| Created | `fldiEzkgLsD4eLhHF` | formula | Read only |
| Last Modified | `fldK1z3WvRgy1NucG` | formula | Read only |
| Appointments | `fldiMi2l98HdCCHAW` | multipleRecordLinks | Links to Schedule |

> **Note:** The old `Capabilities` multipleSelect field has been removed. Spanish and tier capability are now separate fields (`Spanish` checkbox and `Tiers` multiselect).

#### Instructor Records

| Record ID | Full Name | Role(s) |
|-----------|-----------|---------|
| `rec1LPY4vdt0KbXM5` | Mari | Instructor |
| `rec3bANj210wjddFO` | Tobias | Office Admin, Sales Staff |
| `recBOvYj1BaL2aEbX` | Lorrie | Instructor |
| `recBkce2X4A1rKIpZ` | Jennifer | Instructor |
| `recLwHIybyrSonO8a` | Michelle | Instructor, Office Admin, Sales Staff |
| `recNONNjnnxaj9EmM` | Lorena | Office Admin, Sales Staff |
| `recQeVFA25KjyCHpM` | Charles | Instructor |
| `recXoBl9vis7kgWdO` | Margarita Noyes | Office Admin, Instructor, Sales Staff |
| `recZJ4Wcmv2EF5nTN` | Chad | Instructor |
| `recb83SbUu3WPLByN` | Mason | Instructor |
| `recbuwiXWUjkckgid` | Brent | Instructor |
| `recjMS1TEsLoxrjgP` | Erica | Office Admin |
| `recrn3q7j3YKWT871` | Heather | Office Admin |
| `recxnBQMHW8mF3Xlb` | Mr. O | Instructor (Spanish) |

---

### Cars Fields

> Table was formerly named "Vehicles". Airtable table name is "Cars" (`tblog7VBOinu5eVqp`).

| Field | ID | Type | Notes |
|-------|----|------|-------|
| Car Name | `flduaHxeUe18Y09DP` | singleLineText | Primary display field |
| Availability | `fld8BXNxmFXw77aZZ` | multipleRecordLinks | Links to Availability |
| Appointments | `fldeQixDezXKvJc9F` | multipleRecordLinks | Links to Schedule |
| Record ID | `fldl8uW24SY3uw5w2` | formula | Read only |
| Created | `fldayxd5oACHqXZfU` | formula | Read only |
| Last Modified | `fldCVxWL8ZfbdZcKV` | formula | Read only |

#### Car Records

| Record ID | Car Name |
|-----------|----------|
| `recSdoikMlaHyPkXJ` | Car 1 |
| `receODwUMoXKBHekC` | Car 2 |
| `recPiQubC1DOFgMu0` | Car 3 |
| `recVetzxyrQHNfw9L` | Car 4 |
| `recXUC065S3gWyDqY` | Car 5 |

---

### Availability Fields

**Last verified:** 2026-02-21 (live API)

| Field | ID | Type | Notes |
|-------|----|------|-------|
| Record ID | `fld25y1AY1rquJwmx` | formula | Primary — read only |
| Status | `fldQTPMjnjTLbAgN6` | singleSelect | "Scheduled" (`selrlBAvdXEtrTY5z`) / "Blocked Off" (`seliNvDcBMJm10EZh`) |
| Instructor | `fldUao9vyLTkkqAsh` | multipleRecordLinks | Links to Instructors |
| Vehicle | `fld6xoS3XDdBdX3Qd` | multipleRecordLinks | Links to Cars |
| Location | `fld3hPPZq6RjQfEHo` | singleSelect | "CH" / "GA" |
| Start | `fldsvwUb7vY8JVwQr` | dateTime | Shift start (not "Shift Start") |
| Shift Length | `flddlnzPypEaaDQnW` | duration | Shift duration in seconds |
| End | `fld9AfRH5dykYArQv` | formula | `DATEADD({Start}, {Shift Length}/60, 'minutes')` — read only |
| Day of Week | `fldNaBQ9iQCe1Jx4R` | formula | `DATETIME_FORMAT({Start}, 'ddd')` — read only |
| Classroom | `fld7YPZifR1Hn21EB` | singleSelect | "Class Room 1" (`selwXcGrY8Zfs49vd`) / "Class Room 2" (`selEQ30GOnDPQZZF9`) |
| Notes | `fldgdmX4a44WOaT2i` | multilineText | |
| Cadence | `flddEcAhjU8RvIFlJ` | singleSelect | "Weekly" (`selcCgWq5obHNEfTM`) / "Bi-Weekly" (`selwOS7lXiOo33avZ`) — no longer written by app (legacy) |
| Repeate Until | `fldqclSXT33dNYKLq` | date | End of recurrence — typo "Repeate" is baked into Airtable |
| Created | `fldRvBiDiJ54qaq5p` | formula | Read only |
| Last Modified | `fldjSB1j28IydcDAq` | formula | Read only |

> `Blocked Off` scope rules (Phase 20, not yet implemented): Instructor+Vehicle → pair-specific; Instructor-only → all that instructor's windows; Vehicle-only → all that car's windows.

---

### Services Fields

| Field | ID | Type | Notes |
|-------|----|------|-------|
| Abreviation | `fldrXExMC2LS5rJVo` | singleLineText | Short code — primary field |
| Name | `fld5liUomnekwDqNT` | singleLineText | Service name |
| Prices | `fldRgo9irNEs8NwFR` | multipleRecordLinks | Links to Prices |
| Record ID | `fld49WZIrCVg2WhjT` | formula | Read only |
| Created | `fldTzZgLLkzUYnb2L` | formula | Read only |
| Last Modified | `fldlWZZrvJcoLpoxM` | formula | Read only |

---

### Prices Fields

| Field | ID | Type | Notes |
|-------|----|------|-------|
| Abreviation | `fldR6jrxy6CgVSDgg` | formula | Auto-generated display string — read only |
| Price | `fldQY9R3T9OfZXQCi` | currency | USD |
| Course Abreviation | `fldUbYGgKQqADUDSU` | multipleRecordLinks | Links to Courses — for course-based prices |
| Name (from Course Abreviation) | `fld6TX4iuix5RruRU` | multipleLookupValues | Read only |
| Serivces Abreviation | `fldwNUHM1sjEiZTo4` | multipleRecordLinks | Links to Services — typo "Serivces" baked in |
| Name (from Serivces Abreviation) | `fldctfTJ5yxqKLp1z` | multipleLookupValues | Read only |
| Bundled | `fldaMNQIpYZ92qKMS` | number | Sessions in bundle (1 = not bundled) |
| Walk In | `fldpxwNOWpBOT1jaj` | checkbox | Walk-in rate flag |
| Online | `fldCKDoIQ33mZR3E6` | checkbox | Online rate flag |
| Record ID | `fldAR9xHQJb7p1lXd` | formula | Read only |
| Created | `fldphcOKarPLlsfG5` | formula | Read only |
| Last Modified | `fldREcxqUQsf8usb6` | formula | Read only |

---

### Legacy Tables

**Students - Old** (`tblzt3omoGVGSfWTj`) and **Courses - Old** (`tblQbKtjmfN4RN28r`) contain the current operational data for the school and are still in active use. These tables have many fields with emoji prefixes in Airtable. Not actively developed against — see prior schema notes in git history if needed.

---

## Boundaries

- **Internal vs External:** Airtable is the external data store; tools read/write via Airtable REST API
- **Trust boundaries:** API key must be kept in `.env` (never committed)
- **Write rules:** Linked record fields expect `[recordId]` array format; PUDO stored as seconds; Start as ISO 8601 with Eastern offset; formula/lookup fields are read-only

## Where to Start Reading

1. [app/src/utils/constants.js](../app/src/utils/constants.js) — all IDs and field maps
2. [app/src/airtable/client.js](../app/src/airtable/client.js) — Airtable fetch wrapper
3. [app/src/App.jsx](../app/src/App.jsx) — routes and top-level layout
4. [app/src/pages/CalendarPage.jsx](../app/src/pages/CalendarPage.jsx) — main calendar view
