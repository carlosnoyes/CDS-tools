# Architecture

> System overview for CDS-tools.

## Goals

- <!-- TODO: Define primary goals -->
- Provide reusable tooling for CDS workflows

## Non-Goals

- <!-- TODO: Define what's explicitly out of scope -->

## High-Level Diagram

```
┌────────────────────────────────────────────────────────┐
│                      CDS-tools                         │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │                  app/ (React/Vite)               │  │
│  │                                                  │  │
│  │  ┌─────────────┐    ┌──────────────────────────┐ │  │
│  │  │  React UI   │    │  hooks/                  │ │  │
│  │  │  Components │◄───│  useAppointments         │ │  │
│  │  └─────────────┘    │  useReferenceData        │ │  │
│  │                     └──────────┬───────────────┘ │  │
│  │                                │                  │  │
│  │                     ┌──────────▼───────────────┐ │  │
│  │                     │  airtable/               │ │  │
│  │                     │  appointments.js         │ │  │
│  │                     │  courses.js              │ │  │
│  │                     │  instructors.js          │ │  │
│  │                     │  students.js             │ │  │
│  │                     │  vehicles.js             │ │  │
│  │                     └──────────┬───────────────┘ │  │
│  │                                │                  │  │
│  │                     ┌──────────▼───────────────┐ │  │
│  │                     │  client.js               │ │  │
│  │                     │  (Airtable REST API)     │ │  │
│  │                     └──────────────────────────┘ │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
                            │
                            ▼
               ┌────────────────────────┐
               │   Airtable Base        │
               │   appfmh7j77kCe8hy2    │
               └────────────────────────┘
```

## Key Modules

### App (`app/`)

React/Vite frontend — appointment scheduling tool.

| Module | Location | Purpose |
|--------|----------|---------|
| Airtable client | `app/src/airtable/client.js` | Thin fetch wrapper — handles auth, pagination, CRUD, errors |
| Appointments | `app/src/airtable/appointments.js` | Fetch (by week range), create, update, delete appointments |
| Courses | `app/src/airtable/courses.js` | Fetch all in-car courses (Abbreviation, Name, Length, In Car) |
| Instructors | `app/src/airtable/instructors.js` | Fetch all instructors (Full Name, First Name, Last Name, Role, Capabilities) |
| Students | `app/src/airtable/students.js` | Fetch all students (Full Name, First Name, Last Name, Phone, Email) |
| Vehicles | `app/src/airtable/vehicles.js` | Fetch all vehicles (Car Name) |
| Constants | `app/src/utils/constants.js` | `BASE_ID`, `TABLES` map, `APPT_FIELDS` map, `LOCATIONS`, `INSTRUCTOR_ORDER` |
| Colors | `app/src/utils/colors.js` | Instructor color assignment utilities |
| Time | `app/src/utils/time.js` | Date/time helpers |
| Overlap | `app/src/utils/overlap.js` | Appointment overlap detection |
| useAppointments | `app/src/hooks/useAppointments.js` | Hook — fetch/mutate appointments for a given week |
| useReferenceData | `app/src/hooks/useReferenceData.js` | Hook — fetch instructors, vehicles, courses, students |

### Design Patterns

- All Airtable modules import table IDs from `constants.js` — never hardcoded inline
- Formula and lookup fields are **read-only** — only writable fields are passed to create/update
- `APPT_FIELDS` maps semantic names to Airtable field IDs; use it everywhere instead of raw IDs

## Data Flow

```
User Action (React UI)
  → useAppointments / useReferenceData hook
    → airtable/*.js module (appointments, courses, instructors, etc.)
      → client.js (fetch wrapper with auth + pagination)
        → Airtable REST API (base: appfmh7j77kCe8hy2)
```

## Key Dependencies

| Dependency | Purpose |
|------------|---------|
| Airtable | Primary data store (see Airtable Base below) |
| React + Vite | Frontend framework for the appointment scheduling app |

## Airtable Base

**Base:** Colonial Driving School - Carlos
**Base ID:** `appfmh7j77kCe8hy2`
**API Key env var:** `VITE_AIRTABLE_API_KEY` (in `app/.env`)
**Last synced:** 2026-02-19 (live API — full field IDs verified, schema updated)

### Tables

The base is mid-migration. New tables are being built out; old tables contain the operational data.

All new tables were duplicated from **Template Table** and share the same 3 base fields: `Record ID` (formula), `Created` (formula), `Last Modified` (formula).

| Table | ID | Status | Purpose |
|-------|----|--------|---------|
| Students | `tblpG4IVPaS8tq4bp` | Active (new) | Student records |
| Courses | `tblthPfZN6r0FCD9P` | Active (new) | Course catalog (name, abbreviation, length, delivery type, age/tier/location options) |
| Services | `tbl7hzYhb2kHDE7dg` | Active (new) | Services catalog (name, abbreviation) |
| Prices | `tblDZMwgA9Ay0JbRA` | Active (new) | Pricing table — course/service links, bundling, walk-in, online |
| Sales | `tbl0aRT60VhcLq06G` | Active (new) | Sales tracking — stub only, no fields yet beyond base 3 |
| Schedule | `tblo5X0nETYrtQ6bI` | Active (new) | Appointment scheduling — student, instructor, car, course links; PUDO, location, classroom (formerly named "Appointments") |
| Instructors | `tblwm92MbaoRT2dSa` | Active (new) | Instructor records |
| Cars | `tblog7VBOinu5eVqp` | Active (new) | Vehicle tracking — has `Car Name` field (formerly named "Vehicles" in docs) |
| Availability | `tbl5db09IrQR5rmgU` | Active (new) | Instructor/resource availability — schedule and blockout records |
| Template Table | `tblsF8RF9pA0ndM3P` | Reference | Source template — do not delete |
| Students - Old | `tblzt3omoGVGSfWTj` | Legacy (operational) | Current student records — enrollment, class dates, payment, status |
| Courses - Old | `tblQbKtjmfN4RN28r` | Legacy (operational) | Current course catalog with abbreviations and pricing |
| Emails - Old | `tblIb0hJ8uF0FcUGP` | Legacy (operational) | Email templates tied to courses |

### Base Fields (all new tables inherit these)

| Field | Type | Formula |
|-------|------|---------|
| Record ID | formula | `RECORD_ID()` |
| Created | formula | `CREATED_TIME()` |
| Last Modified | formula | `LAST_MODIFIED_TIME()` |

### Key Relationships

**New table relationships (live as of 2026-02-19):**

| From | Field | To | Inverse Field |
|------|-------|----|---------------|
| Students | Appointments (`fldcMrrWus0qxba8i`) | Schedule | Student (`fldSGS6xsegcdEklh`) |
| Instructors | Appointments (`fldiMi2l98HdCCHAW`) | Schedule | Instructor (`fldtQT4tfTJ5FCm9T`) |
| Instructors | Availability (`fldRTIb0HtZyZuhsL`) | Availability | Instructor (`fldUao9vyLTkkqAsh`) |
| Cars | Appointments (`fldeQixDezXKvJc9F`) | Schedule | Cars (`fldPRZoDW0yAe2YwQ`) |
| Cars | Availability (`fld8BXNxmFXw77aZZ`) | Availability | Vehicle (`fld6xoS3XDdBdX3Qd`) |
| Courses | Appointments (`fldtOvjel2szfdL5o`) | Schedule | Course (`fldy84c9JSS2ris1w`) |
| Courses | Prices (`fldzJJrWfRxAhTyec`) | Prices | Course Abreviation (`fldUbYGgKQqADUDSU`) |
| Services | Prices (`fldRgo9irNEs8NwFR`) | Prices | Serivces Abreviation (`fldwNUHM1sjEiZTo4`) |

**Legacy table relationships:**

| From | Field | To | Notes |
|------|-------|----|-------|
| Students - Old | ✅ Course (`flddBlrwg1MMLxd9H`) | Courses - Old | Many-to-many; inverse: Courses field on Courses - Old |
| Courses - Old | Courses (`fldUZYEl09bjVKvmg`) | Students - Old | Inverse of above |

### Students Fields

| Field | ID | Type | Notes |
|-------|----|------|-------|
| Full Name | `fldWUXq0QsdYjc1Jt` | formula | `{First Name} & " " & {Last Name}` — primary display field |
| First Name | `fldAyjsGGXkg72xfC` | singleLineText | |
| Last Name | `fldAb8QMpEQI7INWU` | singleLineText | |
| Phone | `fldC7mwK6qHNlJojs` | phoneNumber | |
| Email | `fldGLUgpK7OhK09hf` | email | |
| Guardian First Name | `fld1MkpVvhEpNM5Yx` | singleLineText | |
| Guardian Last Name | `fldil8hf91KCEJiw4` | singleLineText | |
| Guardian Relation | `fldbWdPSN5Nev2blX` | singleLineText | Relationship of guardian to student |
| Guardian Phone | `fld6WORo9bVhoV0Js` | phoneNumber | |
| Guardian Email | `fldVn5HpMzAIi1a13` | email | |
| Address | `fldf1aK38wvLlWi0o` | singleLineText | |
| Appointments | `fldcMrrWus0qxba8i` | multipleRecordLinks | Links to Appointments (`tblo5X0nETYrtQ6bI`) |
| Record ID | `fld4T1EeyMJhy5PdE` | formula | `RECORD_ID()` |
| Created | `fldXMa8koP1LCwQZj` | createdTime | |
| Last Modified | `fldYo3mtE2C4ElMyO` | lastModifiedTime | |

### Courses Fields

| Field | ID | Type | Notes |
|-------|----|------|-------|
| Abreviation | `fldHUdk9ITWQ6mSiV` | singleLineText | Short code — primary field (note: typo in field name) |
| Name | `fldCWflJhm4TpgzaI` | singleLineText | Full course name |
| Length | `fldzZ2kJsZPEi2dfr` | duration | h:mm format |
| Age Options | `fldWr2bOGldhdpTOh` | multipleSelects | "T" (`selt54GaBqwlwleoH`) = Teen, "A" (`selF9kyGKXMeiNHH8`) = Adult |
| Tier Options | `flduTGL79ThCqoHBH` | multipleSelects | "S" (`seloOQYDki8VoBLqC`), "EL" (`selpnEd6wU74Rv1zt`), "RL" (`selIJN8rLl7GKYcCJ`) |
| Locations Options | `fldHv3fV08Vq5uyc8` | multipleSelects | "CH" (`selnomAuRRV5fsE6R`) = Colonial Heights, "GA" (`selgVKmnhhoUZYonU`) = Glen Allen |
| Spanish Offered | `fld7UztUuJefSRKeQ` | checkbox | Whether this course can be taught in Spanish |
| PUDO Offered | `fld4S7xmH4bmZ0su5` | checkbox | Whether pick-up/drop-off is offered for this course |
| Additional Requirements | `fldoL83911YET3o6C` | multilineText | Free-form additional requirements notes |
| Type | `fldldJ1rrd6dsaqRC` | singleSelect | "In Car" (`sel1YgWAIaKJ5JF05`), "Classroom" (`sel8NCA25JWV1aXTB`) |
| Prices | `fldzJJrWfRxAhTyec` | multipleRecordLinks | Links to Prices (`tblDZMwgA9Ay0JbRA`) |
| Appointments | `fldtOvjel2szfdL5o` | multipleRecordLinks | Links to Schedule (`tblo5X0nETYrtQ6bI`) |
| Record ID | `fldq9cgq3G2z4UNfs` | formula | `RECORD_ID()` — read only |
| Created | `fldfzfxtnoGd0lHYk` | formula | `CREATED_TIME()` — read only |
| Last Modified | `fldHWfg97NjHNnUtl` | formula | `LAST_MODIFIED_TIME()` — read only |

### Services Fields

| Field | ID | Type | Notes |
|-------|----|------|-------|
| Abreviation | `fldrXExMC2LS5rJVo` | singleLineText | Short code — primary field |
| Name | `fld5liUomnekwDqNT` | singleLineText | Service name |
| Prices | `fldRgo9irNEs8NwFR` | multipleRecordLinks | Links to Prices (`tblDZMwgA9Ay0JbRA`) |
| Record ID | `fld49WZIrCVg2WhjT` | formula | `RECORD_ID()` |
| Created | `fldTzZgLLkzUYnb2L` | formula | `CREATED_TIME()` |
| Last Modified | `fldlWZZrvJcoLpoxM` | formula | `LAST_MODIFIED_TIME()` |

### Availability Fields

**Last verified:** 2026-02-19 (live API)

| Field | ID | Type | Notes |
|-------|----|------|-------|
| Record ID | `fld25y1AY1rquJwmx` | formula | `RECORD_ID()` — primary |
| Instructor | `fldUao9vyLTkkqAsh` | multipleRecordLinks | Links to Instructors (`tblwm92MbaoRT2dSa`) |
| Vehicle | `fld6xoS3XDdBdX3Qd` | multipleRecordLinks | Links to Vehicles (`tblog7VBOinu5eVqp`) |
| Status | `fldQTPMjnjTLbAgN6` | singleSelect | "Scheduled" (`selrlBAvdXEtrTY5z`) / "Blocked Off" (`seliNvDcBMJm10EZh`) |
| Day of Week | `fldNaBQ9iQCe1Jx4R` | formula | `DATETIME_FORMAT({Start}, 'ddd')` |
| Start | `fldsvwUb7vY8JVwQr` | dateTime | Start datetime of shift (field was named "Shift Start" in docs — actual name is "Start") |
| Shift Length | `flddlnzPypEaaDQnW` | duration | Duration of shift |
| End | `fld9AfRH5dykYArQv` | formula | `DATEADD({Start}, {Shift Length}/60, 'minutes')` (field was named "Shift End" — actual name is "End") |
| Notes | `fldgdmX4a44WOaT2i` | multilineText | Free-form notes |
| Repeate Until | `fldqclSXT33dNYKLq` | date | ISO format (YYYY-MM-DD) — end of recurrence (note: typo "Repeate" is in Airtable) |
| Cadence | `flddEcAhjU8RvIFlJ` | singleSelect | "Weekly" (`selcCgWq5obHNEfTM`) / "Bi-Weekly" (`selwOS7lXiOo33avZ`) |
| Created | `fldRvBiDiJ54qaq5p` | formula | `CREATED_TIME()` |
| Last Modified | `fldjSB1j28IydcDAq` | formula | `LAST_MODIFIED_TIME()` |

> Note: The Availability schema was rebuilt from the original 9-field design. Key changes: `Type`/`Week`/`Start Date`/`End Date` fields removed; replaced with `Status`, `Cadence`, `Repeate Until`, `Vehicle` link, and `Start`/`Shift Length`/`End`. Field names "Shift Start" and "Shift End" in prior docs were incorrect — actual Airtable names are "Start" and "End".

### Schedule Fields

> Table was formerly named "Appointments" in docs. Airtable table name is now "Schedule" (`tblo5X0nETYrtQ6bI`).

**Last verified:** 2026-02-19 (live API)

| Field | ID | Type | Notes |
|-------|----|------|-------|
| Abreviation | `fldSsrlgL0Fhx6Ci4` | formula | Instructor + Student + Cars + Course + Class Number — primary display; read only |
| Student | `fldSGS6xsegcdEklh` | multipleRecordLinks | Links to Students (`tblpG4IVPaS8tq4bp`) |
| Course | `fldy84c9JSS2ris1w` | multipleRecordLinks | Links to Courses (`tblthPfZN6r0FCD9P`) |
| Instructor | `fldtQT4tfTJ5FCm9T` | multipleRecordLinks | Links to Instructors (`tblwm92MbaoRT2dSa`) |
| Type (from Course) | `fldGxc1NcZ2YaII67` | multipleLookupValues | Lookup: Course.Type — "In Car" (`sel1YgWAIaKJ5JF05`) / "Classroom" (`sel8NCA25JWV1aXTB`); read only |
| Cars | `fldPRZoDW0yAe2YwQ` | multipleRecordLinks | Links to Cars (`tblog7VBOinu5eVqp`) |
| Classroom | `flduE85AAa1DBFLtv` | singleSelect | "Class Room 1" (`selIjC2WTOnLTrk8z`), "Class Room 2" (`sel1YzU4ymsGzlIIP`) |
| Name (from Course) | `fldUeLt9UGlCM2L46` | multipleLookupValues | Lookup: Course.Name — read only |
| Locations Options (from Course) | `fldxfTefJ4xSiSU4O` | multipleLookupValues | Lookup: Course.Locations Options — "CH" / "GA"; read only |
| Location | `fldkQZ5XXOZTqXPlm` | singleSelect | "CH" (`selPdzvazKRfWYRRL`) = Colonial Heights, "GA" (`selUXvKoLoACASQYG`) = Glen Allen |
| Age Options (from Course) | `fld9fUgLPziU5WiUb` | multipleLookupValues | Lookup: Course.Age Options — "T" / "A"; read only |
| Age | `fldhdQS61vRqqbVJc` | singleSelect | "T" (`sel9nKw5tnRPpY8qC`) = Teen, "A" (`selC4gRIi0It7DRqO`) = Adult |
| Tier Options (from Course) | `fldVFu0EN6v19tSPZ` | multipleLookupValues | Lookup: Course.Tier Options — "S" / "EL" / "RL"; read only |
| Tier | `fldWMcjKhn1y7INxi` | singleSelect | "EL" (`selsRh2uHNRU15pIF`), "RL" (`selj5NjQlGb5U3bSh`) |
| Spanish Offered (from Course) | `fldj52kkWsaDd1pyy` | multipleLookupValues | Lookup: Course.Spanish Offered — read only |
| Spanish | `fld17lzRvlLbFdUa4` | checkbox | Whether this appointment is in Spanish |
| PUDO Offered (from Course) | `fldKi9AiTLgUj9cYL` | multipleLookupValues | Lookup: Course.PUDO Offered — read only |
| PUDO | `fld6nShioyE8NGlKH` | singleSelect | Pick-up/drop-off duration: "0:30" (`selkr4YTe8RGnbGTx`), "1:00" (`selmtSjiFUkrW58lB`) |
| Start | `fldSEIbrQiwpMhwB4` | dateTime | Appointment start datetime (America/New_York, 12hr) |
| Pickup At | `fldOFlvxOnqvJAYEz` | formula | `IF({PUDO}=BLANK(), BLANK(), DATEADD({Start}, SWITCH({PUDO}, "0:30", 30, "1:00", 60, 0), "minutes"))` — read only |
| Length (from Course) | `fldv3IBKE2TiYhAhX` | multipleLookupValues | Lookup: Course.Length (used in End formula) — read only |
| Dropoff At | `fldsPG5OdcFDuleX1` | formula | `IF({PUDO}=BLANK(), BLANK(), DATEADD({End}, -SWITCH({PUDO}, "0:30", 30, "1:00", 60, 0), "minutes"))` — read only |
| End | `fldA4Cct6GbdTJf9v` | formula | `DATEADD({Start}, ({Length (from Course)}/60) + 2*SWITCH({PUDO}, "0:30", 30, "1:00", 60, 0), "minutes")` — read only |
| Class Number | `fldw5sIWilBYqwQdl` | number | Sequential class number within student's enrollment |
| Notes | `fldwDBhLucKlzEiMu` | singleLineText | Free-form notes |
| Record ID | `fldlXk1OUtz0S8ghl` | formula | `RECORD_ID()` — read only |
| Created | `fldanniRebdEOza0d` | formula | `CREATED_TIME()` — read only |
| Last Modified | `fldCKn1xYAQ8BBnve` | formula | `LAST_MODIFIED_TIME()` — read only |

### Prices Fields

**Last verified:** 2026-02-19 (live API)

| Field | ID | Type | Notes |
|-------|----|------|-------|
| Abreviation | `fldR6jrxy6CgVSDgg` | formula | `IF({Course Abreviation}, {Course Abreviation}, {Serivces Abreviation}) & IF({Bundled} > 1, " - x" & {Bundled}, "") & IF({Walk In}, " - WI", "")` — primary display; read only |
| Price | `fldQY9R3T9OfZXQCi` | currency | USD |
| Course Abreviation | `fldUbYGgKQqADUDSU` | multipleRecordLinks | Links to Courses (`tblthPfZN6r0FCD9P`) — use for course-based prices |
| Name (from Course Abreviation) | `fld6TX4iuix5RruRU` | multipleLookupValues | Lookup: Course.Name — read only |
| Serivces Abreviation | `fldwNUHM1sjEiZTo4` | multipleRecordLinks | Links to Services (`tbl7hzYhb2kHDE7dg`) — use for service-based prices (note: "Serivces" typo is in Airtable) |
| Name (from Serivces Abreviation) | `fldctfTJ5yxqKLp1z` | multipleLookupValues | Lookup: Service.Name — read only |
| Bundled | `fldaMNQIpYZ92qKMS` | number | Number of sessions/classes bundled (1 = not bundled) |
| Walk In | `fldpxwNOWpBOT1jaj` | checkbox | Whether this is a walk-in rate |
| Online | `fldCKDoIQ33mZR3E6` | checkbox | Whether this is an online rate |
| Record ID | `fldAR9xHQJb7p1lXd` | formula | `RECORD_ID()` — read only |
| Created | `fldphcOKarPLlsfG5` | formula | `CREATED_TIME()` — read only |
| Last Modified | `fldREcxqUQsf8usb6` | formula | `LAST_MODIFIED_TIME()` — read only |

### Instructors Fields

**Last verified:** 2026-02-19 (live API)

| Field | ID | Type | Notes |
|-------|----|------|-------|
| Full Name | `fldKw9WxSgHttxyAC` | formula | `{First Name} & " " & {Last Name}` — primary display field |
| First Name | `fld8ZEXvgtSpt0918` | singleLineText | |
| Last Name | `fldWq6NUn5452RrVb` | singleLineText | |
| Capabilities | `fldd71WcnVHnEp6tP` | multipleSelects | "Spanish" (`selddAw3l8G6a7sed`), "Enhanced Learning" (`selun4gR1vxUObH1U`) |
| Role | `fldgm6vIgy9h7D2zB` | multipleSelects | "Instructor" (`sel4VrYsahTuK05Zs`), "Office Admin" (`sel9CpMMpemt1xebv`), "Sales Staff" (`sel2qLouqC9RWOzYr`) |
| Availability | `fldRTIb0HtZyZuhsL` | multipleRecordLinks | Links to Availability (`tbl5db09IrQR5rmgU`) |
| Appointments | `fldiMi2l98HdCCHAW` | multipleRecordLinks | Links to Appointments (`tblo5X0nETYrtQ6bI`) |
| Record ID | `fldtew3drKZqiknYN` | formula | `RECORD_ID()` |
| Created | `fldiEzkgLsD4eLhHF` | formula | `CREATED_TIME()` |
| Last Modified | `fldK1z3WvRgy1NucG` | formula | `LAST_MODIFIED_TIME()` |

#### Instructor Records (all current)

| Record ID | Full Name | First Name | Role(s) |
|-----------|-----------|------------|---------|
| `rec1LPY4vdt0KbXM5` | Mari | Mari | Instructor |
| `rec3bANj210wjddFO` | Tobias | Tobias | Office Admin, Sales Staff |
| `recBOvYj1BaL2aEbX` | Lorrie | Lorrie | Instructor |
| `recBkce2X4A1rKIpZ` | Jennifer | Jennifer | Instructor |
| `recLwHIybyrSonO8a` | Michelle | Michelle | Instructor, Office Admin, Sales Staff |
| `recNONNjnnxaj9EmM` | Lorena | Lorena | Office Admin, Sales Staff |
| `recQeVFA25KjyCHpM` | Charles | Charles | Instructor |
| `recXoBl9vis7kgWdO` | Margarita Noyes | Margarita | Office Admin, Instructor, Sales Staff |
| `recZJ4Wcmv2EF5nTN` | Chad | Chad | Instructor |
| `recb83SbUu3WPLByN` | Mason | Mason | Instructor |
| `recbuwiXWUjkckgid` | Brent | Brent | Instructor |
| `recjMS1TEsLoxrjgP` | Erica | Erica | Office Admin |
| `recrn3q7j3YKWT871` | Heather | Heather | Office Admin |
| `recxnBQMHW8mF3Xlb` | Mr. O | Mr. O | Instructor (Spanish) |

### Cars Fields

> Table was formerly named "Vehicles" in docs. Airtable table name is "Cars" (`tblog7VBOinu5eVqp`).

**Last verified:** 2026-02-19 (live API)

| Field | ID | Type | Notes |
|-------|----|------|-------|
| Car Name | `flduaHxeUe18Y09DP` | singleLineText | Vehicle identifier — primary display field |
| Availability | `fld8BXNxmFXw77aZZ` | multipleRecordLinks | Links to Availability (`tbl5db09IrQR5rmgU`) |
| Appointments | `fldeQixDezXKvJc9F` | multipleRecordLinks | Links to Schedule (`tblo5X0nETYrtQ6bI`) |
| Record ID | `fldl8uW24SY3uw5w2` | formula | `RECORD_ID()` — read only |
| Created | `fldayxd5oACHqXZfU` | formula | `CREATED_TIME()` — read only |
| Last Modified | `fldCVxWL8ZfbdZcKV` | formula | `LAST_MODIFIED_TIME()` — read only |

#### Vehicle Records (all current)

| Record ID | Car Name |
|-----------|----------|
| `recSdoikMlaHyPkXJ` | Car 1 |
| `receODwUMoXKBHekC` | Car 2 |
| `recPiQubC1DOFgMu0` | Car 3 |
| `recVetzxyrQHNfw9L` | Car 4 |
| `recXUC065S3gWyDqY` | Car 5 |

### Students - Old Fields (legacy)

Field names use emoji prefixes in Airtable. Actual API names shown below.

| Field (API name) | ID | Type | Notes |
|------------------|----|------|-------|
| ➗ Name | `fldd4xOBrUopA7225` | formula | Formatted "Last, First" — primary field |
| ✅ Course | `flddBlrwg1MMLxd9H` | multipleRecordLinks | Links to Courses - Old |
| Price (from ✅ Course) | `fldlS6RRWR0VLKjLM` | multipleLookupValues | Lookup from linked course |
| 📁  Created | `fldPT2dh2cWkUKoQY` | createdTime | |
| 👨‍🎓  Email | `fldub4Ve5bcaCCoBL` | email | Student email |
| 👨‍🎓  Phone # | `fldBNm1kfrJOEH5yU` | phoneNumber | Student phone |
| ✅ Status | `fldkHE9CQyWqZEDjz` | singleSelect | No Website Payment, Active, Complete, Refund, Failed Payment, Correct Error, Inactive, pd stripe Sept 8, ✅ Status, Pending, Incomplete |
| Payment Type | `fldg5dvJ1WBF9CDpP` | singleSelect | Cash, Swipe Simple, Website, Payment Type, 🟥 Not Paid, 🟧 Partial Payment |
| Last 4 Digits | `fldL20ZtwJFYCqHyL` | singleLineText | Last 4 of card |
| ✍️  Notes | `fld2jRbocwpxPkEkP` | multilineText | |
| 📆 DIC | `fldJ6OsNt4oHIkbjU` | date | Driver Improvement Course scheduled |
| ✔️ DIC Attended | `fldkdqdKCT6FgcTkL` | date | |
| 📆 RADEP | `fldGvI4JEIQj3CAHq` | date | RADEP scheduled |
| ✔️ RADEP Attended | `fldssTJvNLvVZgsHl` | date | |
| 📆 DMC | `fldl9b52YhQdQBNcP` | date | |
| 📆 Online Completion Date | `fld6fuzZnJRiNPISv` | date | |
| 🌏 Location | `fldrXFejKBoHQT1PG` | singleSelect | Colonial Heights, Glen Allen |
| 👩‍👦 Alt Contact Full Name | `fldh41wax7PWwdSX6` | singleLineText | Guardian/alt contact name |
| 👩‍👦  Phone # | `fld83WxWE5MEdEHNP` | phoneNumber | Alt contact phone |
| 👩‍👦  Email Address | `fldYhG6Ou5CRFjXQF` | email | Alt contact email |
| 🚗 Address | `fldtjschUoT7THlU3` | singleLineText | |
| 📁  Last Modified | `fldhOa1gEt3ckhfEX` | lastModifiedTime | |
| 📁  Primary Email | `fldubhqbnvVw8eBzf` | formula | Student email, falls back to alt contact |
| 🆃 Registration | `fldvkAMxoOwBWb3q6` | singleSelect | Yes, 🆃 Registration |
| 🆔 ID | `fldqlCjgJ5JYNGWw8` | autoNumber | Auto-incrementing student ID |
| Alt Contact | `fldvu2E955k7FtXsj` | checkbox | Whether alt contact info is filled |
| Course Abbreviation (from ✅ Course) | `fldSZCkljv1fatLIG` | multipleLookupValues | Lookup from linked course |
| Send Certificates | `fldn2fNfmXwFGQyCm` | singleLineText | |
| 🌏 RADEP Location | `fldcn8vs0Crp8vfPV` | singleSelect | Colonial Heights |
| ➗ Location | `fldPWWY56kVVO9arr` | formula | Address string for Colonial Heights emails |
| ➗ RADEP Location | `fldkKyH7ZIXMB8ulE` | formula | Address string for RADEP emails |
| Student # | `fldG1wjT9e5HdHewj` | autoNumber | Separate auto-number field |
| Distance | `fld0eEIQwhP3W8eyW` | singleSelect | 🟢 Under 30 Minutes, ⚠️ Over 30 Minutes |
| 👨‍🎓 Full Name | `fldp2NZFLbRvWNipA` | singleLineText | Raw "First Last" input |
| ➗ 🧑‍🎓 First Name | `fldICvIH6KiPslS7t` | formula | Parsed from Full Name |
| ➗ 🧑‍🎓 Last Name | `fldN4qELDcufx2mS2` | formula | Parsed from Full Name |
| ➗ 👩‍👦 First Name | `fldtVDygPQrf3EkXt` | formula | Parsed from Alt Contact Full Name |
| 🧑‍🎓 DOB | `fld5JYEBnbz9HZzP5` | date | Date of birth |
| Sales Associate | `fldifBXD7wrDjiQMu` | singleSelect | Tobias, Heather, Erika, Michelle, Margarita |
| Website Source | `fld1Qc7xDwrjjb0XS` | checkbox | |
| Asked for Review | `fldYFxcGCZeKaaWmP` | singleSelect | Yes, Pending, Complete, Asked |
| ➗ 🧑‍🎓 Phone Searchable | `fld4JE4WNAIOjXCUg` | formula | Normalized phone (+1 format) for search |
| ➗ 👩‍👦 Phone Searchable | `flddiPmAdRBDyvayh` | formula | Normalized alt contact phone |
| 👩‍👦 Relationship | `flde4KhLtvMynaMiU` | singleSelect | Parent, Legal Guardian, Other |
| Adult Issue Date | `fld2AKmYDxjDk3SAN` | date | |
| DE Completion Date | `fldk2rMmMVrGlLi9S` | date | |

### Courses - Old Fields

| Field | ID | Type | Notes |
|-------|----|------|-------|
| Course Abbreviation | `fldaa1xrKgQbcYpaM` | singleLineText | Primary field / short code |
| Course | `fld1Yd3yQpzp31NMf` | singleLineText | Full course name |
| Price | `fld4ZmTC5GFwzFcie` | currency | USD, 2 decimal places |
| Courses | `fldUZYEl09bjVKvmg` | multipleRecordLinks | Links to Students - Old (inverse of ✅ Course) |
| ➗ Record ID 🆔 | `fldb3pEgYP6QTUFeg` | formula | RECORD_ID() for linking |
| CRM copy | `fldQ42PsjHtGQy8DI` | singleLineText | Legacy CRM reference |
| Online Students | `fldML02DNLAjZYG7w` | singleLineText | Legacy reference |
| Email | `fldejtXYM30gUS9m0` | multilineText | Email body template for this course |
| CRM copy (2) | `fldRZejLTQIIQ0qYR` | singleLineText | Duplicate CRM copy field |
| Contact Log | `fldvLNxuQ4qT2Z0Qn` | singleLineText | Legacy reference |
| CRM copy (3) | `fldZER9Efh8LBqf5s` | singleLineText | Third CRM copy field |

### Emails - Old Fields

| Field | ID | Type | Notes |
|-------|----|------|-------|
| ➗ ✅ Product | `fld1WuSCr2SyH4epy` | formula | Derived from ⛓️ Product — primary field |
| Course Name | `fldS33A547oSxkmlj` | multilineText | Full course name |
| Email | `fldLTqoTQbzw5wvBO` | singleLineText | Email content/template |
| ⛓️ Product | `fldGFA6EGnzIyHo2s` | singleLineText | Course/product reference key |

## Boundaries

- **Internal vs External:** Airtable is the external data store; tools in this repo read/write via the Airtable REST API
- **Trust boundaries:** API key must be kept in `.env` (never committed)

## Where to Start Reading

1. Start with this file for the big picture
2. <!-- TODO: Point to main entry point -->
3. <!-- TODO: Point to key modules -->
