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
| Car | multipleRecordLinks → Cars | Array of one record ID; only for In Car courses |
| Course | multipleRecordLinks → Courses | Array of one record ID |
| Start | dateTime | ISO 8601; Eastern timezone in Airtable |
| PUDO | duration (seconds) | `null` (none), `1800` (30 min), `3600` (60 min) — stored as integer seconds; UI displays as `"0:30"` / `"1:00"` |
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

**Drag-to-resize (primary zoom mechanism):**
- **Column width**: a thin drag handle sits on the right border of each day column header. Dragging it left/right resizes all columns simultaneously — all columns always share the same width. The cursor changes to `col-resize` on hover.
- **Time gutter width**: a drag handle sits on the right border of the hour-axis bar (left edge of the grid). Dragging it left/right resizes the time gutter. This is independent of column width.
- Both handles snap to a minimum size to keep the UI legible.
- Horizontal column range: 60–1200 px/col. Time gutter range: 40–200 px.

**Scroll-wheel zoom (secondary / fine-tune):**
- **Vertical axis zoom**: double-click the time gutter to enter vertical zoom mode (blue ring indicator). While active, scroll the mouse wheel to stretch or compress `PX_PER_HOUR`. Press Esc or click anywhere else to exit.
- **Horizontal axis zoom**: double-click the day-header row to enter horizontal zoom mode. While active, scroll the mouse wheel to stretch or compress column width.
- **Scroll lock**: while either scroll-zoom mode is active, container scroll is completely blocked — the wheel only affects the zoom value, not page position.
- Vertical range: 20–600 px/hr. Horizontal range: 60–1200 px/col.
- Both zoom levels are independent and persist while the user is on the calendar page.

##### Day Popout

- **Double-click a day column header** (the date label at the top of any column) to open that day in a **popout detail view**.
- The popout shows a single day in full width — the same time grid and appointment blocks as the main calendar, but expanded so individual blocks are easier to read and interact with.
- The popout opens as a modal/overlay on top of the calendar; closing it (Esc or ×) returns to the normal week view with state preserved.
- Zoom levels (px/hr) in the popout are independent of the main calendar zoom.

##### Calendar Date Picker

- **Clicking any date chip in the week selector** (the "Feb 17 – Feb 23" style range label, or individual day chips if shown) opens an **inline calendar picker**.
- The picker allows jumping to any arbitrary date — weeks or months in the past or future — without having to arrow through one week at a time.
- Selecting a date in the picker closes it and scrolls the main calendar to the week containing that date.
- The picker supports month/year navigation so jumping far forward or backward is fast.

##### Lane Layout (By Car)

Appointments and availability lanes are laid out horizontally within each day column **by car** (fixed — no toggle).

**Lane order (left to right) — only active lanes are shown:**
1. Cars with availability or appointments on that day, sorted numerically by Car Name (Car 1 → Car N)
2. Classrooms (Class Room 1, Class Room 2) — only included if there is at least one appointment using that classroom on that day
3. Unassigned — only included if there are appointments with neither a car nor a classroom, or no-car availability instructor seeds; sub-divided by instructor

A lane only takes space if it has something on that day. Empty lanes are omitted entirely, so all available width is shared among the lanes that are actually active. This means a day with only Car 1 and Car 3 booked will show two equal-width lanes — not five.

- One vertical lane per active car/classroom. All appointments sharing the same car (or classroom) on the same day are in the same lane.
- If two appointments in the same lane overlap in time, they are sub-divided within that lane.
- **Availability overlay**: intervals with a car clip to that car's lane; intervals with no car clip to the instructor's sub-lane within the Unassigned lane.

##### Instructor Availability Overlay

The calendar visually indicates when each instructor (and their paired car) is available to be scheduled.

**Visual style:** Availability windows are rendered as a **translucent background wash** in the instructor's color, clipped to the car's lane. The strip shows the instructor's name and car name as small inline text (when tall enough). On hover, a tooltip shows:
```
{Instructor Name}
{Car Name}
{Start Time} – {End Time}
```

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

**Lane interaction:**
- Availability intervals that have a car linked clip to that car's lane. Availability intervals with no car clip to the instructor's sub-lane within the shared "No Car" lane at the right.

**Car pairing:** Each availability record links both an instructor and a vehicle. When a car is linked, the availability overlay also reflects which car is assigned during that window. This is surfaced in the tooltip on hover: `"Instructor Name — Car Name — 9:00 AM – 5:00 PM"`. No additional visual distinction is added for the car pairing beyond the tooltip.

##### Appointment Blocks

- Color is determined by instructor (stable, from `INSTRUCTOR_ORDER`)
- **Click an appointment block** → opens the edit form for that appointment
- **Click an empty time slot** → opens the **New Appointment** form (never the edit form) with fields pre-filled from context:
  - **Date** — the calendar date of the column clicked
  - **Start Time** — the clicked hour, snapped to the nearest whole hour
  - **Instructor** — if an availability interval covers the clicked time in that column, the interval's instructor is pre-filled
  - **Car** — if the covering availability interval has a linked vehicle, it is pre-filled (even though the Car field is hidden until a Course is selected — it is stored in form state and surfaces automatically when an In Car course is chosen)
  - If multiple availability intervals overlap the clicked time (e.g. no-car sub-lanes), the first covering interval is used
- Appointments dynamically reflow when the zoom changes

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

**On the Calendar view (`/calendar`):** The form opens as a **sidebar** fixed to the right side of the screen, leaving the calendar fully visible and scrollable behind it. The sidebar has a fixed width and a close (×) button in its header. This lets users scroll through weeks to visually confirm availability without closing the form. When the user changes the **Date** field in the sidebar, the calendar automatically navigates to the week containing that date.

**On the Table view (`/table`):** The form opens as a modal dialog (unchanged).

**Create mode:** Form opens with Date defaulting to today and Start Time defaulting to 8:00 AM (both overridden if clicked from calendar, which pre-fills the clicked time). Student, Course, and Instructor start empty. End Time is shown but calculated (read-only).
**Edit mode:** All fields pre-filled from the existing record. Delete button appears in the sidebar/modal header.

#### Always-Visible Fields

These fields are always shown regardless of course selection:

| Field | Input Type | Required | Notes |
|-------|-----------|----------|-------|
| Student | Dropdown (LinkedSelect) | **Yes** | Options from Students table |
| Course | Dropdown (LinkedSelect) | **Yes** | Options from Courses table; label uses the **Lookup** field (the computed name Airtable surfaces via formula/lookup), not the raw name field |
| Instructor | Dropdown (LinkedSelect) | **Yes** | Options from Instructors table |
| Date | Date picker | **Yes** | Sets the appointment date |
| Start Time | Time picker | **Yes** | Time of day the appointment begins |
| End Time | Displayed read-only | — | Calculated: `Start + Course.Length + 2 × PUDO`; shown so user can confirm |
| Class # | Number — auto-calculated | No | Auto-increments from student's most recent appointment of same Course (see Class Number Logic below) |
| Notes | Text input | No | Free text; optional |

#### Conditionally Shown Fields

**Car and Classroom are hidden until a Course is selected.** Once a course is selected, exactly one of Car or Classroom is shown based on the course's `Type`:

| Field | Condition | Input Type | Options | Default |
|-------|-----------|-----------|---------|---------|
| Car | Course selected **and** `Type` = `"In Car"` | Dropdown (LinkedSelect) — **Required** | Cars table | Auto-populated from instructor's availability window; required for In Car courses |
| Classroom | Course selected **and** `Type` = `"Classroom"` | Select | `"Class Room 1"`, `"Class Room 2"` | `"Class Room 1"` |
| Class # | `Numbered` = true on the selected Course | Number — auto-calculated | Integer | Auto-increments from student's most recent same-Course appointment |
| Higher Tier | `Tier Options` is non-empty on the selected Course | Select | `""` (none/blank), plus values from `Tier Options`: `EL`, `RL` | `""` (blank) |
| Location | `Location Options` is non-empty on the selected Course | Select | Values from `Location Options`: `CH`, `GA` | `CH` (Colonial Heights) |
| Spanish | `Spanish Offered` = true on the selected Course | Checkbox | checked = Spanish session | unchecked |
| PUDO | `PUDO Offered` = true on the selected Course | Select | `""` (none), `0:30`, `1:00` | `""` (none) |

> **No course selected:** Car and Classroom fields are hidden entirely. Once a course is chosen the correct field appears automatically.

> **Options sourced from Airtable:** All conditional option lists (Tier, Location) are read from the course record's fields directly. This means if Airtable's course options change, the form automatically reflects the new options.

#### Class Number Logic

Class # is only shown when the selected Course has `Numbered = true`. When visible, it is auto-calculated:

1. When a Student + Course combination is selected, query all existing appointments for that student + course
2. Find the highest `Class Number` among those records
3. Set `Class Number = highest + 1`; if no prior appointments exist, default to `1`
4. The calculated value is shown in the form (editable as an override if needed)

#### Bulk Scheduling

After filling in all form fields, the user chooses how to proceed:

- **"Schedule One"** — creates a single appointment with the current form data (default behavior)
- **"Bulk Schedule"** — creates multiple appointments from the same base form data

**Button order in the form footer (left to right):** Cancel — Bulk Schedule — Create Appointment (or Save in edit mode). Bulk Schedule sits between the two primary actions so it is accessible but not the default path.

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

**Hard errors (red)** — block submission entirely:
- The field(s) involved glow red (destructive ring style)
- An error message appears below the affected fields
- The submit button is disabled until all hard errors are resolved
- In bulk scheduling, the tab/page indicator for any draft with a hard error is highlighted red

**Warnings (orange)** — allow submission after acknowledgement:
- The field(s) involved glow orange (warning ring style)
- A warning message appears below the affected fields
- The scheduler can still submit despite warnings — they are informational only
- In bulk scheduling, draft tabs with warnings are highlighted orange

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

#### W1 — Instructor Not Available at Proposed Time *(warning)*

**Trigger:** The selected instructor has no `"Scheduled"` availability interval (after subtracting `"Blocked Off"` records) that covers the proposed appointment's full time range on the selected date.

**Severity:** Warning only — does not block submission.

**Fields highlighted (orange):** Instructor, Date, Start Time

**Message:** `"[Instructor Name] has no availability window covering this time. Schedule anyway?"`

**Behavior:**
- Checked eagerly whenever Instructor, Date, or Start Time changes
- Uses the same cached availability data (`useAvailability`) as the calendar overlay — no extra API call
- Auto-population (see below) fires before this check; if a valid window is found the warning clears automatically

---

#### W2 — Car Not in Instructor's Availability Window *(warning)*

**Trigger:** A car is selected that does not match the car linked to the instructor's availability window for the proposed time. Applies only to In Car appointments.

**Severity:** Warning only — does not block submission.

**Fields highlighted (orange):** Car

**Message:** Up to two contextual lines, omitting any line where the data is not available:
```
[Instructor Name] is scheduled for [Their Car] at this time.
[Selected Car] is scheduled for [Its Instructor] at this time.
```
- First line: shown only if the instructor has a covering window with a different car linked.
- Second line: shown only if the selected car appears in another instructor's availability window at this time.
- If neither line can be populated, falls back to: `"[Car Name] is not the car scheduled for [Instructor Name] at this time."`

---

#### Auto-population — Car from Instructor Availability

When Instructor, Date, and Start Time are all set for an In Car course:
1. Expand the instructor's availability records for the selected date
2. Find the availability window that covers the proposed start time
3. If that window has a linked vehicle **and** the Car field is currently empty, auto-fill the Car field with that vehicle
4. If no matching window exists, leave Car unchanged and show W1 (instructor not available)
5. If a window exists but has no car linked (e.g. office shift), leave Car unchanged

Auto-population only fires when Car is empty. It does not overwrite a manually selected car (but W2 will warn if the selection doesn't match).

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
| PUDO | `null` / `1800` / `3600` integer (seconds) | `""` / `"0:30"` / `"1:00"` select dropdown | `pudoFromSeconds()` on read; `pudoToSeconds()` on write |
| Student / Instructor / Cars / Course | `["recXXX"]` array | Name string from lookup map | Array → first element → map lookup for display; wrapped back in `[recId]` on write |
| Instructor color | Record ID | Hex color `#3b82f6` | `COLOR_MAP[id]` — display only |
| Calendar position | Start ISO string | `top` in px | `(startHour - DAY_START_HOUR) × pxPerHour` — display only |
| Calendar height | Start + End ISO strings | `height` in px | `(endMs - startMs) / 3_600_000 × pxPerHour`, min 20px — display only |

### Request Flow — Creating an Appointment

```
1. User clicks empty time slot in calendar
2. DayColumn calculates clicked time (snapped to 60-min); checks availability intervals covering that time to extract instructorId and vehicleId
3. CalendarPage opens AppointmentModal in create mode, passing a `prefill` object: { startDate, startTime, instructorId?, carId? }
4. AppointmentForm reads prefill (not record) so isEdit = false; pre-populates Date, Start Time, Instructor, and Cars fields
5. User fills in Student, Course, and any remaining fields
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
| `car` | Car | `fldPRZoDW0yAe2YwQ` |
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
