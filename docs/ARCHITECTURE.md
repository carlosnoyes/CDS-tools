# Architecture

> System overview for CDS-tools.

## Goals

- <!-- TODO: Define primary goals -->
- Provide reusable tooling for CDS workflows

## Non-Goals

- <!-- TODO: Define what's explicitly out of scope -->

## High-Level Diagram

```
┌─────────────────────────────────────────┐
│              CDS-tools                  │
│                                         │
│  ┌───────────┐  ┌───────────┐           │
│  │  Tool A   │  │  Tool B   │  ...      │
│  └─────┬─────┘  └─────┬─────┘           │
│        │               │                │
│        └───────┬───────┘                │
│                ▼                        │
│        ┌───────────────┐                │
│        │  Shared Utils │                │
│        └───────────────┘                │
└─────────────────────────────────────────┘
```

<!-- TODO: Replace with actual architecture once modules are defined -->

## Key Modules

| Module | Location | Purpose |
|--------|----------|---------|
| <!-- TODO --> | `src/` | <!-- TODO --> |

## Data Flow

<!-- TODO: Describe how data moves through the system -->

## Key Dependencies

| Dependency | Purpose |
|------------|---------|
| Airtable | Primary data store (see Airtable Base below) |

## Airtable Base

**Base:** Colonial Driving School - Carlos
**Base ID:** `appfmh7j77kCe8hy2`
**API Key env var:** `AIRTABLE_API_KEY` (see `.env`)
**Last synced:** 2026-02-18 (live API — full field IDs verified, schema updated)

### Tables

The base is mid-migration. New tables are being built out; old tables contain the operational data.

All new tables were duplicated from **Template Table** and share the same 3 base fields: `Record ID` (formula), `Created` (formula), `Last Modified` (formula).

| Table | ID | Status | Purpose |
|-------|----|--------|---------|
| Students | `tblpG4IVPaS8tq4bp` | Active (new) | Student records — being built out |
| Courses | `tblthPfZN6r0FCD9P` | Active (new) | Course catalog (name, abbreviation, length, delivery type) |
| Services | `tbl7hzYhb2kHDE7dg` | Active (new) | Services catalog (name, abbreviation) |
| Prices | `tblDZMwgA9Ay0JbRA` | Active (new) | Pricing table — fully built out with course/service links, bundling, walk-in, versioning |
| Sales | `tbl0aRT60VhcLq06G` | Active (new) | Sales tracking — stub only, no fields yet beyond base 3 |
| Appointments | `tblo5X0nETYrtQ6bI` | Active (new) | Appointment tracking — fully built out with student, instructor, vehicle, course links |
| Instructors | `tblwm92MbaoRT2dSa` | Active (new) | Instructor records — stub only, no fields yet beyond base 3 |
| Vehicles | `tblog7VBOinu5eVqp` | Active (new) | Vehicle tracking — has `Car Name` field |
| Availability | `tbl5db09IrQR5rmgU` | Active (new) | Instructor/resource availability — schedule and blockout records |
| Emails | `tbl88z78Dd2sHDmeR` | Active (new) | Email management — stub only, no fields yet beyond base 3 |
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

**New table relationships (live as of 2026-02-18):**

| From | Field | To | Inverse Field |
|------|-------|----|---------------|
| Students | Appointments (`fldcMrrWus0qxba8i`) | Appointments | Student (`fldSGS6xsegcdEklh`) |
| Instructors | Appointments (`fldiMi2l98HdCCHAW`) | Appointments | Instructor (`fldtQT4tfTJ5FCm9T`) |
| Instructors | Availability (`fldRTIb0HtZyZuhsL`) | Availability | Instructor (`fldUao9vyLTkkqAsh`) |
| Vehicles | Appointments (`fldeQixDezXKvJc9F`) | Appointments | Vehicle (`fldPRZoDW0yAe2YwQ`) |
| Vehicles | Availability (`fld8BXNxmFXw77aZZ`) | Availability | Vehicle (`fld6xoS3XDdBdX3Qd`) |
| Courses | Appointments (`fldtOvjel2szfdL5o`) | Appointments | Course (`fldy84c9JSS2ris1w`) |
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
| Classroom | `fldC13titqbm9wUrz` | checkbox | Delivered in classroom |
| In Car | `fldPa8Fru1tuLqS60` | checkbox | Behind-the-wheel component |
| Online | `fldz4r0qVUSzU64Uk` | checkbox | Online delivery option |
| Prices | `fldzJJrWfRxAhTyec` | multipleRecordLinks | Links to Prices (`tblDZMwgA9Ay0JbRA`) |
| Appointments | `fldtOvjel2szfdL5o` | multipleRecordLinks | Links to Appointments (`tblo5X0nETYrtQ6bI`) |
| Record ID | `fldq9cgq3G2z4UNfs` | formula | `RECORD_ID()` |
| Created | `fldfzfxtnoGd0lHYk` | formula | `CREATED_TIME()` |
| Last Modified | `fldHWfg97NjHNnUtl` | formula | `LAST_MODIFIED_TIME()` |

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

**Last verified:** 2026-02-18 (live API)

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

### Appointments Fields

**Last verified:** 2026-02-18 (live API)

| Field | ID | Type | Notes |
|-------|----|------|-------|
| Abreviation | `fldSsrlgL0Fhx6Ci4` | formula | Auto-generated label from linked records + Class Number |
| Record ID | `fldlXk1OUtz0S8ghl` | formula | `RECORD_ID()` |
| Created | `fldanniRebdEOza0d` | formula | `CREATED_TIME()` |
| Last Modified | `fldCKn1xYAQ8BBnve` | formula | `LAST_MODIFIED_TIME()` |
| Student | `fldSGS6xsegcdEklh` | multipleRecordLinks | Links to Students (`tblpG4IVPaS8tq4bp`) |
| Instructor | `fldtQT4tfTJ5FCm9T` | multipleRecordLinks | Links to Instructors (`tblwm92MbaoRT2dSa`) |
| Vehicle | `fldPRZoDW0yAe2YwQ` | multipleRecordLinks | Links to Vehicles (`tblog7VBOinu5eVqp`) |
| Course | `fldy84c9JSS2ris1w` | multipleRecordLinks | Links to Courses (`tblthPfZN6r0FCD9P`) |
| Name (from Course) | `fldUeLt9UGlCM2L46` | multipleLookupValues | Lookup: Course.Name |
| Length (from Course) | `fldv3IBKE2TiYhAhX` | multipleLookupValues | Lookup: Course.Length (used in End formula) |
| PUDU | `fld6nShioyE8NGlKH` | duration | Pick-up/drop-off time added to course length |
| Start | `fldSEIbrQiwpMhwB4` | dateTime | Appointment start datetime |
| End | `fldA4Cct6GbdTJf9v` | formula | `DATEADD({Start}, ({Length (from Course)} + 2*{PUDU})/60, 'minutes')` |
| Class Number | `fldw5sIWilBYqwQdl` | number | Sequential class number within student's enrollment |
| Location | `fldkQZ5XXOZTqXPlm` | singleSelect | "Colonial Heights" (`selPdzvazKRfWYRRL`), "Glen Allen" (`selUXvKoLoACASQYG`) |
| Notes | `fldwDBhLucKlzEiMu` | singleLineText | Free-form notes |

### Prices Fields

**Last verified:** 2026-02-18 (live API)

| Field | ID | Type | Notes |
|-------|----|------|-------|
| Abreviation | `fldR6jrxy6CgVSDgg` | formula | `{Course or Service abbrev} + optional "- xN" bundling + optional "- WI" walk-in` — primary display |
| Unique Abreviation | `flddBnjfDq6jA02Eu` | formula | `{Abreviation} & " - v" & {Version}` — unique key |
| Price | `fldQY9R3T9OfZXQCi` | currency | USD |
| Course Abreviation | `fldUbYGgKQqADUDSU` | multipleRecordLinks | Links to Courses (`tblthPfZN6r0FCD9P`) — use for course-based prices |
| Name (from Course Abreviation) | `fld6TX4iuix5RruRU` | multipleLookupValues | Lookup: Course.Name |
| Serivces Abreviation | `fldwNUHM1sjEiZTo4` | multipleRecordLinks | Links to Services (`tbl7hzYhb2kHDE7dg`) — use for service-based prices (note: "Serivces" typo is in Airtable) |
| Name (from Serivces Abreviation) | `fldctfTJ5yxqKLp1z` | multipleLookupValues | Lookup: Service.Name |
| Bundled | `fldaMNQIpYZ92qKMS` | number | Number of sessions/classes bundled (1 = not bundled) |
| Walk In | `fldpxwNOWpBOT1jaj` | checkbox | Whether this is a walk-in rate |
| Expires On | `fldFJBRsc0HsQ1b5B` | date | Price expiration date |
| Version | `fldkiXmQOzxa96vi9` | number | Version number for price history tracking |
| Record ID | `fldAR9xHQJb7p1lXd` | formula | `RECORD_ID()` |
| Created | `fldphcOKarPLlsfG5` | formula | `CREATED_TIME()` |
| Last Modified | `fldREcxqUQsf8usb6` | formula | `LAST_MODIFIED_TIME()` |

### Instructors Fields

**Last verified:** 2026-02-18 (live API)

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

### Vehicles Fields

**Last verified:** 2026-02-18 (live API)

| Field | ID | Type | Notes |
|-------|----|------|-------|
| Car Name | `flduaHxeUe18Y09DP` | singleLineText | Vehicle identifier — primary display field |
| Availability | `fld8BXNxmFXw77aZZ` | multipleRecordLinks | Links to Availability (`tbl5db09IrQR5rmgU`) |
| Appointments | `fldeQixDezXKvJc9F` | multipleRecordLinks | Links to Appointments (`tblo5X0nETYrtQ6bI`) |
| Record ID | `fldl8uW24SY3uw5w2` | formula | `RECORD_ID()` |
| Created | `fldayxd5oACHqXZfU` | formula | `CREATED_TIME()` |
| Last Modified | `fldCVxWL8ZfbdZcKV` | formula | `LAST_MODIFIED_TIME()` |

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
