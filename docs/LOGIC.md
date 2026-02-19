# Scheduling Tool — Logic Reference

> Authoritative reference for the CDS appointment scheduling tool. Organized into three layers: what Airtable owns, what the UI owns, and how they communicate.

---

## Overview

The scheduler is a React/Vite web app that reads and writes appointment records in Airtable's **Schedule** table. Users can view appointments in a **year-scroll calendar** or a **sortable table view**, and create/edit/delete appointments via a modal form.

There is no backend server. The browser talks directly to the Airtable REST API using a Bearer token. Airtable is the single source of truth for all data.

```
┌─────────────────────────────────┐
│         Browser (React)         │
│  Calendar · Table · Form        │
└──────────────┬──────────────────┘
               │ HTTPS (Airtable REST API)
               │ Bearer token auth
┌──────────────▼──────────────────┐
│           Airtable              │
│  Schedule table + formulas      │
│  Reference tables (read-only)   │
└─────────────────────────────────┘
```

---

## Part 1 — Airtable (Backend)

Airtable acts as the database and computation layer. It stores all records, enforces field types, and runs formulas automatically whenever a record is written.

### Schedule Table (`tblo5X0nETYrtQ6bI`)

This is the main appointments table. Every appointment is one record here.

#### Writable Fields

These are the only fields the app ever writes to. Everything else is computed by Airtable.

| Field | Type | Notes |
|-------|------|-------|
| Student | multipleRecordLinks → Students | Array of one record ID |
| Instructor | multipleRecordLinks → Instructors | Array of one record ID |
| Cars | multipleRecordLinks → Cars | Array of one record ID; only for In Car courses |
| Course | multipleRecordLinks → Courses | Array of one record ID |
| Start | dateTime | ISO 8601; Eastern timezone in Airtable |
| PUDO | singleSelect | `""` (none), `"0:30"`, `"1:00"` — stored as a string |
| Class Number | number | Integer; auto-calculated in UI, editable override |
| Location | singleSelect | `"CH"` (Colonial Heights) or `"GA"` (Glen Allen); conditional on course |
| Notes | singleLineText | Free text |
| Classroom | singleSelect | `"Class Room 1"` or `"Class Room 2"`; only for Classroom courses |
| Age | singleSelect | `"T"` (teen) or `"A"` (adult); conditional on course |
| Tier | singleSelect | `"EL"` or `"RL"`; conditional on course |
| Spanish | checkbox | `true` = Spanish-language session; conditional on course |

#### Calculated Fields (Airtable Formulas)

These are computed automatically. The app **never writes** to them — doing so causes an API error.

| Field | Formula Logic |
|-------|--------------|
| **End** | `DATEADD(Start, (Course.Length + 2 × PUDO) / 60, "minutes")` |
| **Pickup At** | `DATEADD(Start, PUDO / 60, "minutes")` — when the car arrives |
| **Dropoff At** | `DATEADD(End, -(PUDO / 60), "minutes")` — when the car returns |
| **Abbreviation** | Auto-label: Instructor + Student + Car + Course + Class # |
| Record ID | `RECORD_ID()` — system field |
| Created | `CREATED_TIME()` — system field |
| Last Modified | `LAST_MODIFIED_TIME()` — system field |

#### Lookup Fields (Read from Linked Records)

| Field | Pulls From | Used For |
|-------|-----------|---------|
| Name (from Course) | Course → Name | Display on calendar/table |
| Length (from Course) | Course → Length (seconds) | Used in End formula |
| Type (from Course) | Course → Type | Available in record |
| Age Options (from Course) | Course → Age Options | Available in record |
| Tier Options (from Course) | Course → Tier Options | Available in record |
| PUDO Offered (from Course) | Course → PUDO Offered | Available in record |
| Spanish Offered (from Course) | Course → Spanish Offered | Available in record |
| Locations Options (from Course) | Course → Locations Options | Available in record |

#### End Time Formula — Explained

```
End = Start + Course.Length + PUDO + PUDO
    = Start + (lesson duration) + (pickup travel) + (dropoff travel)
```

Example: Start `10:00 AM`, Course Length `1h (3600s)`, PUDO `30 min (1800s)`
- Lesson ends: 10:00 + 60 min = 11:00 AM
- Pickup travel: 11:00 + 30 min = 11:30 AM
- Dropoff travel: 11:30 + 30 min = 12:00 PM
- **End = 12:00 PM**

PUDO is added **twice** because the instructor drives to pick up the student (after lesson) and then drives back to drop them off.

> **Known field name typo in Airtable:** `"Abreviation"` (one 'b', not two). Do not correct it in API calls — it must match exactly.

---

### Reference Tables (Read-Only from App)

These four tables supply the dropdown options in the form. The app only reads from them, never writes.

#### Instructors (`tblwm92MbaoRT2dSa`)

| Field | Used For |
|-------|---------|
| Full Name | Dropdown label, calendar block, table display |
| First Name | Available in map |
| Last Name | Available in map |
| Role | Available in map |
| Capabilities | Available in map |

A fixed list of 14 instructor record IDs in `INSTRUCTOR_ORDER` (in [constants.js](../app/src/utils/constants.js)) ensures each instructor gets a **stable color** that never shifts between sessions.

#### Students (`tblpG4IVPaS8tq4bp`)

| Field | Used For |
|-------|---------|
| Full Name | Dropdown label, calendar block, table display |
| First Name | Available in map |
| Last Name | Available in map |
| Phone | Available in map |
| Email | Available in map |

#### Cars (`tblog7VBOinu5eVqp`)

| Field | Used For |
|-------|---------|
| Car Name | Dropdown label, table display |

#### Courses (`tblthPfZN6r0FCD9P`)

| Field | Used For |
|-------|---------|
| Abbreviation | Dropdown label |
| Name | Available in map |
| Length | Course duration in seconds (feeds into End formula via lookup) |

All courses are fetched (both In Car and Classroom types). The form conditionally shows Car or Classroom fields based on the selected course's `Type` lookup.

---

## Part 2 — Front End (React UI)

The UI is responsible for displaying data, collecting user input, and triggering API calls. It never computes End time or runs any scheduling math — that all happens in Airtable.

### Views

#### Calendar View (`/`)

The calendar is a single unified view with toolbar controls. All weeks of the year are stacked vertically and continuously scrollable — there are no separate Day / Week / Month modes.

##### Layout

- All weeks of the current calendar year are stacked top-to-bottom, each with its own day-header row and time grid
- The user scrolls down to navigate forward in time and up to go back
- The nav bar (prev/next week arrows + week range label) updates its displayed date automatically as the user scrolls, via `IntersectionObserver`
- The nav arrow buttons and "Today" jump-scroll to the target week (smooth animation)
- Full-year appointments are fetched upfront — no incremental fetches needed as the user scrolls

##### Axis Zoom

- **Vertical axis zoom**: double-click the time gutter (left edge) to enter vertical zoom mode (blue ring indicator). While in this mode, scroll the mouse wheel to stretch or compress the row height per hour (`PX_PER_HOUR`). Press Esc or click anywhere else to lock in the zoom level and exit zoom mode.
- **Horizontal axis zoom**: double-click the day-header row (top edge) to enter horizontal zoom mode. While in this mode, scroll the mouse wheel to stretch or compress column width per day. Press Esc or click anywhere to exit.
- **Scroll lock**: while either zoom mode is active, the container scroll is completely blocked — the wheel only affects the zoom value, not page position.
- Both zoom levels are independent and persist while the user is on the calendar page.
- Vertical range: 20–600 px/hr. Horizontal range: 60–1200 px/col.

##### Grouping Toggle (By Car / By Instructor)

Controls how appointments and availability lanes are laid out horizontally within each day column.

- **By Car**: appointments are organized into vertical lanes, one lane per car. All appointments sharing the same car on the same day are in the same lane and have the same width. Lane widths are equal and sized so that all lanes fill the column without overlap.
  - Appointments with **no car assigned** share a single "No Car" lane at the right of all car lanes. Within the No Car lane, each instructor gets an equal-width sub-lane — so 2 no-car instructors each get half the lane, 3 get a third, etc.
  - If two appointments share a car but overlap in time, they are sub-divided within that lane.
  - **Availability overlay**: intervals with a car clip to that car's lane; intervals with no car clip to their instructor's sub-lane within the No Car lane.

- **By Instructor**: same structure as By Car but lanes are per instructor.
  - Appointments with **no instructor assigned** go in a "No Instructor" lane.
  - Time overlaps within a lane are handled by sub-dividing that lane.
  - **Availability overlay** clips each instructor's strip to exactly their own lane.

**Lane seeding from availability:** If a day has availability records but no appointments yet, lanes are pre-seeded from the availability data so the correct number of non-overlapping lanes are shown even before any appointments are added.

##### Instructor Availability Overlay

The calendar visually indicates when each instructor (and their paired car) is available to be scheduled.

**Visual style:** Availability windows are rendered as a **translucent background wash** in the instructor's color, filling the background of the day column (or instructor lane in By Instructor grouping) for each available time block. The color is the same as the instructor's appointment block color but at much lower opacity (~10–15%) so it reads as a background hint, not a solid block. It should look clearly different from an appointment block — no border, no text, no click action.

**What is shown:**
- For each day visible in the calendar, the system expands each instructor's `Scheduled` availability records to determine which time windows they are working
- Any `Blocked Off` records that fall on that day are subtracted — those time ranges are not highlighted even if they fall within a `Scheduled` window
- The result is a set of `{ instructorId, vehicleId, start, end }` intervals per day that represent actual available (unblocked) windows

**Data source:** Availability table (`tbl5db09IrQR5rmgU`). Fetched alongside appointments, cached 2 minutes (availability changes infrequently but should reflect recent edits within a short session).

**Recurrence expansion:** Availability records repeat on a cadence (`Weekly` or `Bi-Weekly`) from their `Start` date up through `Repeate Until`. The UI expands recurrences client-side for the current view window only — it does not fetch all future records.

**Algorithm:**
1. For each availability record with `Status = "Scheduled"`:
   - Check if any occurrence of the record's cadence falls on the target date (match by day-of-week, within the recurrence window)
   - If yes, add `{ instructorId, vehicleId, shiftStart, shiftEnd }` to the available slots for that day
2. For each availability record with `Status = "Blocked Off"`:
   - Same recurrence check
   - If yes, subtract that time range from all matching `Scheduled` slots for the same instructor + vehicle on that day
3. Render the resulting intervals as background overlays in the calendar

**Grouping interaction:**
- In **By Car** mode: availability intervals that have a car linked clip to that car's lane. Availability intervals with no car clip to the instructor's sub-lane within the shared "No Car" lane at the right.
- In **By Instructor** mode: each instructor's availability wash is drawn only in their own lane, making the availability-vs-appointments relationship visually clear and precise.

**Car pairing:** Each availability record links both an instructor and a vehicle. When a car is linked, the availability overlay also reflects which car is assigned during that window. This is surfaced in the tooltip on hover: `"Instructor Name — Car Name — 9:00 AM – 5:00 PM"`. No additional visual distinction is added for the car pairing beyond the tooltip.

##### Appointment Blocks

- Color is determined by instructor (stable, from `INSTRUCTOR_ORDER`), regardless of grouping mode
- **Click an empty time slot** → opens the create form with that time pre-filled (snapped to 60-min increments)
- **Click an appointment block** → opens the edit form for that appointment
- Appointments dynamically reflow when the grouping or zoom changes

---

#### Table View (`/table`)

- Displays appointments for a user-defined date range in a sortable table
- Default range: today → 1 month from today
- Date range is set via **start date** and **end date** inputs in the filter bar
- No week navigation arrows, no Today button
- Columns: Start, End, Student, Instructor, Vehicle, Course, #, PUDO, Location, Notes
- Click any column header to sort ascending/descending
- Click the pencil icon on any row to edit that appointment

### Appointment Form

The form is used for both creating and editing appointments. Fields appear and update dynamically based on which Course is selected.

**Create mode:** Form opens with Student, Course, Instructor, Date, and Start Time empty (Start pre-filled if clicked from calendar). End Time is shown but calculated (read-only).
**Edit mode:** All fields pre-filled from the existing record. Delete button appears in the modal header.

#### Always-Visible Fields

These fields are always shown regardless of course selection:

| Field | Input Type | Required | Notes |
|-------|-----------|----------|-------|
| Student | Dropdown (LinkedSelect) | **Yes** | Options from Students table |
| Course | Dropdown (LinkedSelect) | **Yes** | Options from Courses table (filtered to active) |
| Instructor | Dropdown (LinkedSelect) | **Yes** | Options from Instructors table |
| Date | Date picker | **Yes** | Sets the appointment date |
| Start Time | Time picker | **Yes** | Time of day the appointment begins |
| End Time | Displayed read-only | — | Calculated: `Start + Course.Length + 2 × PUDO`; shown so user can confirm |
| Class # | Number — auto-calculated | No | Auto-increments from student's most recent appointment of same Course (see Class Number Logic below) |
| Notes | Text input | No | Free text; optional |

#### Conditionally Shown Fields

These fields appear only when the selected Course's lookup values indicate they are applicable.

| Field | Condition | Input Type | Options | Default |
|-------|-----------|-----------|---------|---------|
| Car | `Type (from Course)` = `"In Car"` | Dropdown (LinkedSelect) | Cars table | *(assumed In Car until Classroom course selected)* |
| Classroom | `Type (from Course)` = `"Classroom"` | Select | `"Class Room 1"`, `"Class Room 2"` | — |
| Age | `Age Options (from Course)` is non-empty | Select | Values from `Age Options (from Course)` lookup: `T`, `A` | — |
| Tier | `Tier Options (from Course)` is non-empty | Select | `""` (none/blank), plus values from `Tier Options (from Course)` lookup: `EL`, `RL` | `""` (blank) |
| Location | `Locations Options (from Course)` is non-empty | Select | Values from `Locations Options (from Course)` lookup: `CH`, `GA` | `CH` |
| Spanish | `Spanish Offered (from Course)` = true | Checkbox | checked = Spanish session | unchecked |
| PUDO | `PUDO Offered (from Course)` = true | Select | `""` (none), `0:30`, `1:00` | `""` (none) |

> **Type assumption:** If no course is selected, the form assumes "In Car" and shows the Car field. The Classroom field only appears if a Classroom-type course is explicitly chosen.

> **Options sourced from Airtable:** All conditional option lists (Age, Tier, Location) are read from the course's lookup fields on the selected record, not hardcoded. This means if Airtable's course options change, the form automatically reflects the new options.

#### Class Number Logic

Class Number is auto-calculated, not entered manually:

1. When a Student + Course combination is selected, query all existing appointments for that student + course
2. Find the highest `Class Number` among those records
3. Set `Class Number = highest + 1`; if no prior appointments exist, default to `1`
4. The calculated value is shown in the form (editable as an override if needed)

#### Bulk Scheduling

After filling in all form fields, the user chooses how to proceed:

- **"Schedule One"** — creates a single appointment with the current form data (default behavior)
- **"Bulk Schedule"** — creates multiple appointments from the same base form data

**Bulk Schedule flow:**

1. User clicks "Bulk Schedule" — a number input appears asking how many appointments total
2. The system generates `N` appointment drafts, each identical to the base form but with Start date offset by 1 week per slot (slot 1 = base date, slot 2 = +1 week, slot 3 = +2 weeks, etc.)
3. The user sees a tabbed or paginated view of all drafts (e.g. "1 of 5", "2 of 5") and can navigate between them to make per-appointment adjustments (different instructor, time, car, etc.)
4. Class Numbers auto-increment across the bulk set based on the same logic as single appointments, starting from the next available number
5. When satisfied, user confirms and all drafts are submitted together (parallel POST requests)
6. Any draft that fails validation (conflict, missing required field) blocks the entire submit and highlights the offending draft tab

### Calendar Grid Constants

| Constant | Default Value | Meaning |
|----------|--------------|---------|
| `DAY_START_HOUR` | 8 | First visible hour (8 AM) — fixed |
| `DAY_END_HOUR` | 21 | Last visible hour (9 PM) — fixed |
| `PX_PER_HOUR` | 64 | Pixels per hour — **user-adjustable via vertical scroll zoom** |
| `DAY_COL_WIDTH` | (flexible) | Pixel width per day column — **user-adjustable via horizontal scroll zoom** |

`CALENDAR_HEIGHT_PX` = `(DAY_END_HOUR - DAY_START_HOUR) × PX_PER_HOUR` — recalculates when `PX_PER_HOUR` changes.

**Block top position:**
```
top = (startHour + startMinutes/60 - DAY_START_HOUR) × PX_PER_HOUR
```

**Block height:**
```
height = (endMs - startMs) / 3_600_000 × PX_PER_HOUR  (min 20px)
```

### Overlap Resolution

#### By Instructor mode

1. **Seed lanes** from instructor IDs present in availability intervals (so lanes appear even on days with no appointments)
2. Add any additional instructor IDs found in appointment data not already seeded
3. Append an "unassigned" lane last if any appointments have no instructor
4. Assign each lane an equal share of the column: `laneWidth = 100 / numLanes %`
5. Within each lane, sort appointments by Start time, group into time-overlap clusters, sub-divide within each cluster
6. Block `left` = `laneIndex × laneWidth + clusterOffset`

#### By Car mode

1. **Seed car lanes** from car IDs present in availability intervals
2. Add any car IDs from appointment data not already seeded
3. If any appointments or availability intervals have no car, append a single "No Car" lane at the right
4. Within the No Car lane, run a nested **By Instructor** layout:
   - Seed instructor sub-lanes from no-car availability intervals
   - Add instructor IDs from no-car appointments
   - Assign each instructor an equal sub-lane within the No Car lane
5. Re-scale all sub-lane geometry to fit within the No Car lane's pixel bounds

Example: 3 cars + 2 no-car instructors → 4 lanes (3 car + 1 No Car); No Car lane itself split 50/50 per instructor.

Example: 4 instructors available on a day with no appointments → 4 lanes each 25% wide, all showing only the availability wash.

---

## Part 2b — Scheduling Errors & Validation

This section will grow as new error types are identified. All validation runs client-side before any API call is made. If any error is present, the form cannot be submitted.

### Visual Treatment

- The field(s) involved in a conflict glow red (destructive ring style)
- An error message appears below the field explaining the specific conflict
- In bulk scheduling, the tab/page indicator for any draft with an error is highlighted red
- All errors must be resolved before the submit button becomes active

### Error Types

#### E1 — Student Double-Booking

**Trigger:** The student selected for this appointment already has another appointment whose time range overlaps with the new appointment's computed time range (`Start` to `End`).

**Fields highlighted:** Student, Date, Start Time

**Message:** `"[Student Name] is already booked [Start] – [End] on [Date] with [Instructor]."`

**Exceptions / edge cases:**
- Overlap check uses the computed End time (which includes PUDO), not just Start
- Classroom-only appointments may be exempt if both overlap — to be decided

---

#### E2 — Instructor Double-Booking

**Trigger:** The selected instructor already has another appointment whose time range overlaps.

**Fields highlighted:** Instructor, Date, Start Time

**Message:** `"[Instructor Name] is already scheduled [Start] – [End] on [Date] with [Student]."`

**Exceptions / edge cases:**
- An instructor can teach a classroom session and an in-car session simultaneously only if explicitly configured as allowed — default is no exemption

---

#### E3 — Car Double-Booking

**Trigger:** The selected car already has another appointment whose time range overlaps.

**Fields highlighted:** Car, Date, Start Time

**Message:** `"[Car Name] is already in use [Start] – [End] on [Date] with [Instructor] / [Student]."`

**Exceptions / edge cases:**
- Only applies when a Car is selected (In Car appointments)
- Classroom appointments with no car selected are never flagged for car conflicts

---

#### E4 — Missing Required Field

**Trigger:** User attempts to submit without a required field filled in.

**Fields highlighted:** The empty required field(s)

**Message:** `"[Field name] is required."`

---

#### E5 — Bulk Schedule Partial Conflict

**Trigger:** In bulk scheduling mode, one or more drafts have a conflict (any of E1–E4) but others are clean.

**Treatment:** The overall submit is blocked. The draft tab with the conflict is highlighted red. The user must navigate to that draft and resolve the conflict before any of the drafts are submitted.

---

### Validation Timing

Conflicts (E1–E3) are checked:
1. **On submit** — always, as a final gate
2. **On blur / field change** — ideally checked eagerly when Student, Instructor, Car, Date, or Start Time changes, so the user sees the error before hitting submit

Eager conflict checking requires fetching existing appointments that overlap the selected date. The appointments cache (2-min TTL) is used for this check; no extra API call is made if the cache is warm.

---

## Part 3 — Communication Layer (Browser ↔ Airtable)

This layer is responsible for translating between how Airtable stores data and how the UI needs it, and for managing when data is fetched and refreshed.

### API Client ([app/src/airtable/client.js](../app/src/airtable/client.js))

All requests go to `https://api.airtable.com/v0/{BASE_ID}/{tableId}` with a Bearer token from `VITE_AIRTABLE_API_KEY`. Four operations:

| Function | HTTP | When Used |
|----------|------|-----------|
| `fetchAll(tableId, params)` | GET | Load appointments, reference data |
| `createRecord(tableId, fields)` | POST | Submit new appointment form |
| `updateRecord(tableId, recordId, fields)` | PATCH | Submit edit appointment form |
| `deleteRecord(tableId, recordId)` | DELETE | Confirm delete in modal |

`fetchAll` handles Airtable's offset-based pagination automatically (page size 100).

### Caching Strategy

Managed by TanStack Query. Data is served from cache until stale; mutations force immediate refresh.

| Data | Cache Duration | Why |
|------|---------------|-----|
| Instructors | 30 minutes | Roster rarely changes mid-session |
| Students | 30 minutes | Roster rarely changes mid-session |
| Vehicles | 30 minutes | Fleet rarely changes mid-session |
| Courses | 30 minutes | Curriculum rarely changes mid-session |
| Appointments | 2 minutes | Changes frequently; needs to stay fresh |
| Availability | 2 minutes | Shared cache with appointments; reflects recent schedule edits |

On any create, update, or delete — the appointments cache is **immediately invalidated**, forcing a fresh fetch so the UI reflects the change right away.

### Data Transformations

Every field that crosses the boundary between Airtable storage and the UI is transformed. Nothing is displayed or stored raw.

| Field | Airtable stores | UI displays/inputs | Transformation |
|-------|----------------|-------------------|----------------|
| Start | ISO 8601 string | separate Date + Time inputs | Split on read: `toDateInput()` / `toTimeInput()`; re-combined on write: `combineDateTime(date, time)` |
| End | ISO 8601 string (formula) | `"10:30 AM"` read-only | `format(parseISO(iso), "h:mm a")` — never written |
| PUDO | `""` / `"0:30"` / `"1:00"` string | Select dropdown | Stored and displayed as-is; no numeric conversion |
| Student / Instructor / Cars / Course | `["recXXX"]` array | Name string from lookup map | Array → first element → map lookup for display; wrapped back in `[recId]` on write |
| Instructor color | Record ID | Hex color `#3b82f6` | `COLOR_MAP[id]` — display only |
| Calendar position | Start ISO string | `top` in px | `(startHour - DAY_START_HOUR) × pxPerHour` — display only |
| Calendar height | Start + End ISO strings | `height` in px | `(endMs - startMs) / 3_600_000 × pxPerHour`, min 20px — display only |

### Request Flow — Creating an Appointment

```
1. User clicks empty time slot in calendar
2. DayColumn calculates clicked time (snapped to 60-min)
3. CalendarPage opens AppointmentModal in create mode, pre-filling Start date + time
4. User fills in Student, Course, Instructor, Date, Start Time, and conditional fields
5. AppointmentForm.onSubmit():
   - Combines Date + Time inputs into a single ISO string for Start
   - Wraps linked record IDs in arrays: [recId]
   - Strips undefined / empty fields
6. useCreateAppointment.mutateAsync(fields) → POST to Airtable
7. Airtable computes End, Pickup At, Dropoff At formulas
8. TanStack Query invalidates appointments cache
9. useAppointments re-fetches the year → UI updates
```

### Request Flow — Editing an Appointment

```
1. User clicks appointment block (calendar) or pencil icon (table)
2. AppointmentModal opens in edit mode with record data
3. AppointmentForm.defaultValues():
   - Extracts first element from linked record arrays
   - Splits Start ISO string into separate date / time inputs
4. User modifies fields and submits
5. Same transformation as create (step 5 above)
6. useUpdateAppointment.mutateAsync({ recordId, fields }) → PATCH to Airtable
7. Cache invalidated → UI updates
```

### Request Flow — Loading Reference Data

```
1. App mounts → useReferenceData() runs 4 parallel queries
2. Fetches: Instructors, Students, Vehicles, Courses
3. Builds two structures per entity:
   - Map: { [recordId]: fields } — for name lookups during display
   - Options: [{ value: recordId, label: displayName }] — for form dropdowns
4. Cached for 30 minutes; passed as props to all views and forms
```

---

## Field ID Quick Reference

All field IDs are centralized in [app/src/utils/constants.js](../app/src/utils/constants.js). Use field IDs (not names) in API calls where possible.

### Schedule Table — Writable Fields

| Semantic Name | Airtable Field Name | Field ID |
|---------------|--------------------|----|
| `student` | Student | `fldSGS6xsegcdEklh` |
| `instructor` | Instructor | `fldtQT4tfTJ5FCm9T` |
| `cars` | Cars | `fldPRZoDW0yAe2YwQ` |
| `course` | Course | `fldy84c9JSS2ris1w` |
| `start` | Start | `fldSEIbrQiwpMhwB4` |
| `pudo` | PUDO | `fld6nShioyE8NGlKH` |
| `classNumber` | Class Number | `fldw5sIWilBYqwQdl` |
| `location` | Location | `fldkQZ5XXOZTqXPlm` |
| `notes` | Notes | `fldwDBhLucKlzEiMu` |
| `classroom` | Classroom | `flduE85AAa1DBFLtv` |
| `age` | Age | `fldhdQS61vRqqbVJc` |
| `tier` | Tier | `fldWMcjKhn1y7INxi` |
| `spanish` | Spanish | `fld17lzRvlLbFdUa4` |

### Schedule Table — Read-Only Fields

| Semantic Name | Airtable Field Name | Field ID |
|---------------|--------------------|----|
| `end` | End *(formula)* | `fldA4Cct6GbdTJf9v` |
| `pickupAt` | Pickup At *(formula)* | `fldOFlvxOnqvJAYEz` |
| `dropoffAt` | Dropoff At *(formula)* | `fldsPG5OdcFDuleX1` |
| `abbreviation` | Abreviation *(formula, typo)* | `fldSsrlgL0Fhx6Ci4` |
| `courseNameLookup` | Name (from Course) *(lookup)* | `fldUeLt9UGlCM2L46` |
| `courseLengthLookup` | Length (from Course) *(lookup)* | `fldv3IBKE2TiYhAhX` |
| `courseTypeLookup` | Type (from Course) *(lookup)* | `fldGxc1NcZ2YaII67` |
| `ageOptionsLookup` | Age Options (from Course) *(lookup)* | `fld9fUgLPziU5WiUb` |
| `tierOptionsLookup` | Tier Options (from Course) *(lookup)* | `fldVFu0EN6v19tSPZ` |
| `locationsOptionsLookup` | Locations Options (from Course) *(lookup)* | `fldxfTefJ4xSiSU4O` |
| `spanishOfferedLookup` | Spanish Offered (from Course) *(lookup)* | `fldj52kkWsaDd1pyy` |
| `pudoOfferedLookup` | PUDO Offered (from Course) *(lookup)* | `fldKi9AiTLgUj9cYL` |
| `recordId` | Record ID | `fldlXk1OUtz0S8ghl` |
| `created` | Created | `fldanniRebdEOza0d` |
| `lastModified` | Last Modified | `fldCKn1xYAQ8BBnve` |

### Availability Table (`tbl5db09IrQR5rmgU`) — Fields by Name

| Field Name | Type | Notes |
|-----------|------|-------|
| Instructor | multipleRecordLinks | Linked instructor |
| Vehicle | multipleRecordLinks | Linked car (may be absent for office/classroom shifts) |
| Status | singleSelect | `"Scheduled"` or `"Blocked Off"` |
| Start | dateTime | First occurrence; recurrence anchor |
| Shift Length | number | Duration in seconds |
| End | dateTime formula | Read-only |
| Cadence | singleSelect | `"Weekly"` or `"Bi-Weekly"` |
| Repeate Until | date | End of recurrence window (typo baked into Airtable) |
