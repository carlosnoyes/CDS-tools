# Scheduling Tool — Logic Reference

> Authoritative reference for the CDS appointment scheduling tool. Organized into three layers: what Airtable owns, what the UI owns, and how they communicate. Last updated: 2026-02-21.

---

## Overview

The scheduler is a React/Vite web app that reads and writes records in Airtable. Users can view appointments in a **year-scroll calendar** or a **sortable table view**, manage students in a **Students view**, and create/edit/delete records via sidebar or modal forms.

There is no backend server. The browser talks directly to the Airtable REST API using a Bearer token. Airtable is the single source of truth for all data.

```
┌─────────────────────────────────────────────┐
│              Browser (React)                │
│  Calendar · Table · Students · Availability │
└──────────────┬──────────────────────────────┘
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
| Spanish | W5 capability check (checkbox: `true` = Spanish-capable) |
| Tiers | W6 capability check (multipleSelects: e.g. `["EL", "RL"]`) |

> **Note:** The old `Capabilities` multipleSelect field has been removed from Airtable. Spanish and tier capability are now stored as separate fields. The `instructors.js` module fetches `["First Name", "Last Name", "Role", "Spanish", "Tiers"]`.

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
- Any `Blocked Off` records that fall on that day are subtracted using scoped override rules (instructor-only, vehicle-only, or instructor+vehicle)
- The result is a set of `{ instructorId, vehicleId, start, end }` intervals per day that represent actual available (unblocked) windows

**Data source:** Availability table (`tbl5db09IrQR5rmgU`). Fetched alongside appointments, cached 2 minutes (availability changes infrequently but should reflect recent edits within a short session).

**Data model:** Each availability record is a standalone shift with an explicit `Start` datetime and `Shift Length`. There is no recurrence expansion needed — each record represents exactly one shift on one day.

**Algorithm** (implemented in `app/src/utils/availability.js` → `expandAvailability()`):

1. For each availability record with `Status = "Scheduled"`:
   - Check whether the record's `Start` date matches the target date
   - If yes, compute `startMs`/`endMs` from the record's Start and Shift Length, and add `{ instructorId, vehicleId, location, startMs, endMs }` to the scheduled list
2. For each availability record with `Status = "Blocked Off"`:
   - Same date check
   - If yes, determine its scope from which links are set:
     - **Instructor + Vehicle set**: block only that exact instructor+vehicle pair
     - **Instructor set, Vehicle blank**: block that instructor across all their scheduled windows (any vehicle)
     - **Vehicle set, Instructor blank**: block that vehicle across all scheduled windows (any instructor)
     - **Both blank**: invalid/no-op — ignored
3. Subtract each applicable blocked interval from the matching scheduled intervals. Partial overlaps produce before/after slices; full overlaps are dropped entirely.
4. Return the resulting flat array of unblocked `{ instructorId, vehicleId, location, startMs, endMs }` intervals.
5. Render the resulting intervals as background overlays in the calendar.

**Blocked Off precedence:**
- `Blocked Off` always wins over `Scheduled` for any overlapping time in its scope.
- This allows instructor-wide PTO (instructor-only block) or car downtime (vehicle-only block) without having to specify both links.

**Lane interaction:**
- Availability intervals that have a car linked clip to that car's lane. Availability intervals with no car clip to the instructor's sub-lane within the shared "No Car" lane at the right.

**Location pairing:** Each availability record may carry a `Location` field (`CH` or `GA`). The location is shown as a third line of inline text in the availability strip (below the car name, when the strip is tall enough) and as a line in the hover tooltip. When a user clicks an availability strip to create a new appointment, the `Location` is pre-filled into the form alongside Instructor and Car.

##### Appointment Blocks

- Color is determined by instructor (stable, from `INSTRUCTOR_ORDER`)
- Block text uses a compact 4-line layout:
  - Line 1 (optional meta): `GA` (only when Location = `GA`) and `PUDO30`/`PUDO60` (only when PUDO exists). If neither exists, omit the entire line.
  - Line 2: Instructor full name
  - Line 3: Student full name
  - Line 4 (course token): `Tier-CourseAbbreviationClassNumber` (no spaces), omitting missing parts:
    - Example with tier and class number: `EL-BTW2`
    - Example with tier, no class number: `EL-BTW`
    - Example with no tier, class number present: `BTW2`
    - Example with neither tier nor class number: `BTW`
  - Course **Name** is omitted from block text (abbreviation/token only).
- Appointment block hover metadata (tooltip) shows:
  - `Time: [Start – End]`
  - `Location: [Location]`
  - `PUDO: [30|60] min` (only when PUDO exists)
  - `Instructor: [Instructor Name]`
  - `Student: [Student Name]`
  - `Car/Classroom: [Car Name or Class Room N]`
  - `Course: [ABR - Name]`
  - `Class Number: [#]` (only when class number exists)
  - `Tier: [EL|RL]` (only when tier exists)
  - `Spanish: True` (only when Spanish is checked)
  - `Notes: [text]` (only when Notes is non-empty)
- **Click an appointment block** → opens the edit form for that appointment
- **Click an empty time slot** → opens the **New Appointment** form (never the edit form) with fields pre-filled from context:
  - **Date** — the calendar date of the column clicked
  - **Start Time** — the clicked hour, snapped to the nearest whole hour
  - **Instructor** — if an availability interval covers the clicked time in that column, the interval's instructor is pre-filled
  - **Car** — if the covering availability interval has a linked vehicle, it is pre-filled (even though the Car field is hidden until a Course is selected — it is stored in form state and surfaces automatically when an In Car course is chosen)
  - **Location** — if the covering availability interval has a Location (`CH` or `GA`), it is pre-filled into the form (surfaces when a course with Location options is selected)
  - If multiple availability intervals overlap the clicked time (e.g. no-car sub-lanes), the first covering interval is used
- Appointments dynamically reflow when the zoom changes

---

#### Table View (`/table`)

- Displays appointments for a user-defined date range in a sortable table
- Default range: today → 1 month from today
- Date range is set via **start date** and **end date** inputs in the filter bar
- No week navigation arrows, no Today button
- Columns: Start, End, Student, Instructor, Car, Course, #, PUDO, Location, Notes
- Click any column header to sort ascending/descending
- Click the pencil icon on any row to edit that appointment

---

#### Students View (`/students`)

The Students view provides direct access to the Students table in Airtable. Users can browse, search, create, and edit student records without leaving the scheduling tool.

##### Layout

- A full-width table lists all students, one row per record
- Columns: Full Name, Phone, Email, Teen (badge), Address
- A **search/filter bar** at the top filters rows client-side by name, phone, or email as the user types
- A **"+ New Student"** button in the top-right opens the student form in a side panel

##### Student Form (Sidebar)

The form opens as a **sidebar** fixed to the right side of the screen — same UX pattern as the appointment form on the calendar. It is used for both creating and editing students.

**Create mode:** Opens with all fields blank. Header reads "New Student".
**Edit mode:** All fields pre-filled from the existing record. Header reads the student's full name. A delete button appears in the header.

The sidebar has a close (×) button. Clicking a student row anywhere in the table opens the sidebar in edit mode for that student.

##### Student Form Fields

All fields map directly to the Students table in Airtable (`tblpG4IVPaS8tq4bp`).

**Student Info**

| Field | Airtable Field | Type | Required | Notes |
|-------|---------------|------|----------|-------|
| First Name | First Name | text | **Yes** | |
| Last Name | Last Name | text | **Yes** | |
| Phone | Phone | phone | No | |
| Email | Email | email | No | |
| Address | Address | text | No | |
| Teen | Teen | checkbox | No | Check if the student is a teen |

**Guardian Info**

| Field | Airtable Field | Type | Required | Notes |
|-------|---------------|------|----------|-------|
| Guardian First Name | Guardian First Name | text | No | |
| Guardian Last Name | Guardian Last Name | text | No | |
| Guardian Relation | Guardian Relation | text | No | Relationship to student (e.g. Parent, Guardian) |
| Guardian Phone | Guardian Phone | phone | No | |
| Guardian Email | Guardian Email | email | No | |

> **Read-only fields** (not shown in form): Full Name (formula), Appointments link, Record ID, Created, Last Modified.

##### Write Behavior

- **Create:** POST to Students table with all non-empty fields. Full Name is a formula field computed by Airtable — never written.
- **Update:** PATCH only the changed fields.
- **Delete:** Prompts for confirmation before sending DELETE. Deleting a student does not cascade-delete their appointment records.

##### Caching

Students data in the Students view shares the same 30-minute cache used by `useReferenceData`. After any create, update, or delete, the students cache is immediately invalidated so the table reflects the change.

---

#### Availability View (`/availability`)

The Availability view provides direct management of instructor/resource availability records from the Availability table (`tbl5db09IrQR5rmgU`). It is an exact copy of the Calendar view's interface — same year-scroll layout, same lane structure, same zoom controls — but with all appointments removed, leaving only the availability blocks visible.

##### Layout — Identical to Calendar

The Availability view reuses the Calendar's entire visual system:

- **Year-scroll grid**: all weeks stacked vertically, continuously scrollable (same as Calendar)
- **Nav bar**: prev/next week arrows, week range label, Today button, `IntersectionObserver`-driven date tracking (same as Calendar)
- **Calendar date picker**: click the date range label to jump to any date (same as Calendar)
- **Axis zoom**: drag-to-resize column width, time gutter width; double-click for scroll-wheel zoom mode (same as Calendar)
- **Day popout**: double-click a day column header to expand that day to full width (same as Calendar)
- **Time axis**: 8 AM – 9 PM vertical, same `PX_PER_HOUR` constants
- **By Car lane layout**: Car 1 → Car N → Classrooms → Unassigned, same lane rules (only active lanes shown)

**What's different from Calendar:**
- **No appointment blocks** — only availability strips are rendered
- **No appointment form** — clicking an empty slot opens the **Add Availability** form instead
- **Clicking an availability block** opens the **Edit Availability** form (not the appointment edit form)

##### Availability Blocks

Availability blocks are rendered the same way as the availability overlay in the Calendar view:
- Translucent background wash in the instructor's color (from `INSTRUCTOR_ORDER`)
- Inline text: instructor name, car name, location
- Hover tooltip: instructor, car, start–end time, location
- Blocks are positioned and sized using the same `PX_PER_HOUR` and lane-width calculations as the Calendar

##### Add Availability Form (Sidebar)

Clicking an empty time slot opens the Add Availability form as a sidebar (same pattern as the Calendar's appointment sidebar — fixed to the right side, calendar visible and scrollable behind it).

| Field | Input Type | Required | Notes |
|-------|-----------|----------|-------|
| Start | DateTime picker | **Yes** | Date + time for the first occurrence |
| End | DateTime picker | **Yes** | Date + time for the end of the shift; must be same day as Start |
| Instructor | LinkedSelect | **Yes** | From Instructors table; uses Full Name as label |
| Car | LinkedSelect | No | From Cars table; optional |
| Classroom | Select | No | `"Class Room 1"` or `"Class Room 2"`; optional |
| Recurrence | Select | **Yes** | `None` / `Daily` / `Weekly` / `Bi-Weekly` |
| End Date | Date picker | Conditional | Required when Recurrence ≠ `None`; cannot exceed 1 year from Start date |
| Note | Text input | No | Free text |

**Pre-fill from click context:**
- **Date** — the calendar date of the column clicked
- **Start Time** — the clicked hour, snapped to the nearest whole hour
- **End Time** — defaults to Start + 8 hours (or end of day, whichever is earlier)

**Recurrence expansion on save:**
When Recurrence is set to anything other than `None`, the system creates **one Airtable record per shift occurrence**. For example, if the user sets:
- Start: Mon Feb 23, 8:00 AM
- End: Mon Feb 23, 4:00 PM
- Recurrence: Weekly
- End Date: Mon Mar 23

The system generates 5 individual records (Feb 23, Mar 2, Mar 9, Mar 16, Mar 23), each as a standalone availability record in Airtable with the same time-of-day but on consecutive matching dates.

For `Daily` recurrence, a record is created for every calendar day in the range. For `Bi-Weekly`, every other week.

##### Edit Availability Form (Sidebar)

Clicking an existing availability block opens the Edit Availability form in a sidebar. The form displays all the same fields as the Add form, pre-filled with the record's current values.

**Scope Toggle:** At the top of the edit form, a segmented control lets the user choose the editing scope:

| Mode | Label | Behavior |
|------|-------|----------|
| Single | "Single Shift" | Edits only the clicked record |
| Future | "All Future Shifts" | Edits the clicked record AND all records that share the same recurring series from this date forward |

> **Recurring series identification:** Since each occurrence is a standalone Airtable record, "same series" is determined by matching: same Instructor + same Car/Classroom + same time-of-day + same day-of-week (or daily pattern) + records on or after the selected record's date. The system queries for matching records and presents the count ("This will update N shifts") before applying changes.

**Editable fields:** All fields from the Add form are editable:
- Start (date + time)
- End (date + time)
- Instructor
- Car
- Classroom
- Note

When editing in "All Future Shifts" mode, changes to time-of-day, instructor, car, classroom, or note are applied to all matching future records. Changes to the date itself are not supported in bulk mode (it would break the recurrence pattern).

**Delete:** A delete button appears in the form header. Deletion respects the same scope toggle:
- "Single Shift" → deletes only the clicked record
- "All Future Shifts" → deletes the clicked record and all matching future records
- Confirmation dialog shows the count of records that will be deleted before proceeding

**Split Shift:** A "Split" button appears in the form footer. Splitting divides the selected availability block into two separate records at a user-specified time.

**Split flow:**
1. User clicks "Split" — a time picker appears asking "Split at what time?"
2. The time must be strictly between the shift's Start and End (not at either boundary)
3. On confirm, the system:
   - Updates the original record's End to the split time
   - Creates a new record with Start = split time and End = the original End, copying all other fields (Instructor, Car, Classroom, Note) from the original
4. The two resulting records are fully independent — editing or deleting one does not affect the other

**Split use cases:**
- Switching cars mid-day (split, then change the car on the second half)
- Creating a gap for a doctor's appointment (split into two, then adjust end/start times or delete the middle portion — split twice to carve out a hole)
- Changing location partway through the day

**Split + scope:** Split always operates on a single record only (ignoring the scope toggle). After splitting, the user can then use "All Future Shifts" on either resulting record independently if needed.

##### Write Behavior

Each availability record is a standalone record in Airtable. Recurrence is expanded at creation time into individual records — the `Cadence` and `Repeate Until` fields on the Availability table are **not used** by this model (they remain in Airtable but are ignored).

**Field mapping (form → Airtable):**

| Form Field | Airtable Field | Transformation |
|-----------|---------------|----------------|
| Start (datetime) | `Start` | ISO 8601 datetime string |
| End (datetime) | (not written) | `End` is a formula field — read-only |
| End – Start | `Shift Length` | Computed as `(endMs - startMs) / 1000` → stored as seconds |
| Instructor | `Instructor` | Wrapped in array: `[recId]` |
| Car | `Vehicle` | Wrapped in array: `[recId]`; omitted if blank |
| Classroom | `Classroom` | singleSelect value; omitted if blank |
| Note | `Notes` | singleLineText; omitted if blank |
| — | `Status` | Always set to `"Scheduled"` for availability records |

- On any create/update/delete, the `["availability"]` cache is immediately invalidated
- Split operations issue one PATCH (shorten original) + one POST (new second half) in sequence
- "All Future Shifts" bulk edits issue parallel PATCH requests for all matching records
- "All Future Shifts" bulk deletes issue parallel DELETE requests

##### Shortcut Actions

- **Block Instructor (vacation)**: Select instructor + date range → auto-creates `Blocked Off` records for each day the instructor is normally scheduled in that range. Shows preview count before confirming.
- **Block Car (out of service)**: Select car + date range → auto-creates vehicle-only `Blocked Off` records covering 8am–9pm for each day in the range.

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

1. When a Student + Course combination is selected, query all existing appointments for that student + course.
2. Exclude appointments marked `Canceled = true` or `No Show = true`.
3. For the proposed appointment date/time, find the most recent prior matching appointment (`Start < proposed Start`) in chronological order.
4. Set `Class Number = (that prior appointment's Class Number) + 1`.
5. If no prior non-canceled/non-no-show match exists before the proposed start, default to `1`.
6. The calculated value is shown in the form (editable as an override if needed).

#### Chronology Reindexing on Edit

If an edit changes chronology for a numbered Student+Course sequence (for example changing Date/Start, changing Student, changing Course, or manually changing Class #), class numbering must be re-evaluated for that sequence in chronological order:

1. Recompute class numbers from the edited appointment forward (future appointments in that Student+Course sequence).
2. Keep numbering consistent and gap-free by chronological `Start` order.
3. Exclude `Canceled` and `No Show` appointments from sequence numbering.
4. Before saving, show a warning preview listing impacted future appointments and their class-number changes (old -> new).
5. User must confirm the reindex operation for the save to proceed.

#### Additional Classes

Available only in **edit mode** (editing an existing appointment). The "Additional Classes" button appears in the form footer alongside "Save Changes".

**Purpose:** From an existing appointment, quickly schedule more sessions for the same student/course/instructor — identical to Bulk Schedule but anchored to a real appointment rather than an unsaved draft. The user can see all pre-existing appointments for the same student+course in context while adding new ones.

**Entry:** User clicks "Additional Classes" while viewing an existing appointment in the edit sidebar.

**Flow:**

1. The form transitions into **Additional Classes mode**. The form fields remain visible at the top (still showing the record being edited, still editable and saveable as normal).
2. Below the edit form, a **read-only list** of all existing non-canceled/non-no-show appointments for the same student+course is shown (sorted chronologically). These are displayed as compact non-editable rows — label, date, time, instructor. They are informational only and cannot be opened/edited from this panel.
3. Below the existing list, the user can add **new draft appointments** (same UX as Bulk Schedule — a count input + draft tabs). Drafts default to weekly from the current appointment's date.
4. The user edits each draft independently (same per-draft override model as Bulk Schedule).
5. Conflict and warning checks run identically to Bulk Schedule for each draft.
6. Submitting creates only the new drafts (existing appointments are untouched unless the user has also edited the base record separately via "Save Changes").
7. The "Additional Classes" mode can be exited without saving — returns the sidebar to normal edit mode.

**Key differences from Bulk Schedule:**
- Only available in edit mode (not create mode)
- Shows existing appointments for that student+course as non-editable context rows
- Does not replace the base edit form — both coexist, each with its own save action
- Draft defaults start from the current appointment's date (not today)

#### Bulk Scheduling

After filling in all form fields, the user chooses how to proceed:

- **"Schedule One"** — creates a single appointment with the current form data (default behavior)
- **"Bulk Schedule"** — creates multiple appointments from the same base form data

**Button order in the form footer (left to right):** Cancel — Bulk Schedule — Create Appointment (or Save in edit mode). Bulk Schedule sits between the two primary actions so it is accessible but not the default path.

**Bulk Schedule flow:**

1. User clicks "Bulk Schedule" - a number input appears asking how many appointments total.
2. The system generates `N` appointment drafts, each identical to the base form but with Start date offset by 1 week per slot (slot 1 = base date, slot 2 = +1 week, slot 3 = +2 weeks, etc.).
3. The user sees a tabbed or paginated view of all drafts (e.g. "1 of 5", "2 of 5") and can navigate between them to make per-draft adjustments (different instructor, date, time, car, etc.).
4. Draft order is chronological, not fixed to original creation index. If a draft date/time is changed, drafts are automatically re-sorted by Start.
5. Draft labels and class numbers are recalculated after each draft edit so chronology always stays aligned (example: moving draft 5 to just after draft 1 makes it draft 2 and updates numbering for all following drafts).
6. Class Numbers for bulk use the same rule as single scheduling: previous non-canceled/non-no-show match before each draft's Start + 1.
7. When satisfied, user confirms and all drafts are submitted together (parallel POST requests).
8. Any draft that fails validation (conflict, missing required field) blocks the entire submit and highlights the offending draft tab.

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

The calendar uses **By Car** layout only (By Instructor mode was removed in Phase 11).

#### By Car mode

1. **Seed car lanes** from car IDs present in availability intervals for that day (so lanes appear even with no appointments)
2. Add any car IDs from appointment data not already seeded
3. Sort lanes in fixed order: Car 1 → Car 2 → ... → Car N → Class Room 1 → Class Room 2 → No Car (unassigned)
4. Empty lanes are omitted — a lane only appears if it has availability intervals or appointments on that day
5. If any appointments or availability intervals have no car (and no classroom), append a single "No Car" lane at the right
6. Within the No Car lane, run a nested by-instructor sub-layout:
   - Seed instructor sub-lanes from no-car availability intervals
   - Add instructor IDs from no-car appointments
   - Assign each instructor an equal sub-lane within the No Car lane
7. Within each lane (or sub-lane), sort appointments by Start time, group into time-overlap clusters, sub-divide within clusters
8. Re-scale all sub-lane geometry to fit within the No Car lane's pixel bounds

Example: 3 cars + 2 no-car instructors → 4 lanes (Car 1, Car 2, Car 3, No Car); No Car lane itself split 50/50 per instructor.

Example: 4 instructors available on a day with no appointments → 4 no-car sub-lanes each 25% wide, all showing only the availability wash.

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

**Trigger:** The selected instructor has no `"Scheduled"` availability interval (after applying `"Blocked Off"` override scope rules) that covers the proposed appointment's full time range on the selected date.

**Severity:** Warning only — does not block submission.

**Fields highlighted (orange):** Instructor, Date, Start Time

**Message:** `"[Instructor Name] has no availability window covering this time."`

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
[Instructor Name] should be scheduled for [Their Car] at this time.
[Selected Car] is scheduled for [Its Instructor] at this time.
```
- First line: shown only if the instructor has a covering window with a different car linked.
- Second line: shown only if the selected car appears in another instructor's availability window at this time.
- If neither line can be populated, falls back to: `"[Selected Car] is not the car scheduled for [Instructor Name] at this time."`

---

#### W3 — Instructor Not Scheduled at This Location *(warning)*

**Trigger:** The instructor's covering availability window is for a different location than the one selected for the appointment (e.g. instructor is scheduled at `CH` but the appointment says `GA`).

**Severity:** Warning only — does not block submission.

**Fields highlighted (orange):** Location, Instructor

**Message:** `"[Instructor Name] is scheduled at [Their Location] at this time, not [Selected Location]."`

**Behavior:**
- Only fires when the appointment has a Location field (course has `Locations Options` non-empty)
- Only fires when a covering availability window exists **and** its Location is set **and** it differs from the selected appointment Location
- If the covering window has no location set, no W3 is raised (no data = no warning)
- Does not block submit — the scheduler may intentionally override

---

#### W4 — Instructor Traveling Between Locations Too Quickly *(warning)*

**Trigger:** The instructor has another appointment on the same day at a **different** location that is scheduled within a 30-minute buffer of the proposed appointment (either ending less than 30 minutes before the new one starts, or starting less than 30 minutes after the new one ends).

**Severity:** Warning only — does not block submission.

**Fields highlighted (orange):** Instructor, Date, Start Time

**Message:** `"[Instructor Name] has an appointment at [Other Location] ending at [Time] — less than 30 min travel buffer."`
or
`"[Instructor Name] has an appointment at [Other Location] starting at [Time] — less than 30 min travel buffer."`

**Behavior:**
- Only fires when both appointments have a Location field set and the locations differ
- Travel buffer is exactly 30 minutes (`TRAVEL_BUFFER_MS = 30 * 60 * 1000`)
- Does not block submit — the scheduler may intentionally accept the tight window
- Canceled and No Show appointments are excluded (same as E1–E3)

---

#### W5 — Instructor Not Marked Spanish-Capable *(warning)*

**Trigger:** The appointment has `Spanish = true`, but the selected instructor's `Spanish` checkbox is `false` (or unset) in the Instructors table.

**Severity:** Warning only — does not block submission.

**Fields highlighted (orange):** Instructor

**Message:** `"[Instructor Name] cannot teach Spanish sessions"`

**Behavior:**
- Fires whenever Instructor or Spanish flag changes.
- Uses cached instructor reference data; no extra API call.
- Does not block submit — scheduler may intentionally override.

---

#### W6 — Instructor Not Marked for Selected Tier *(warning)*

**Trigger:** The appointment has a `Tier` selected (for example `EL` or `RL`), but the selected instructor's `Tiers` multiselect in the Instructors table does not include that tier value.

**Severity:** Warning only — does not block submission.

**Fields highlighted (orange):** Instructor

**Message:** `"[Instructor Name] cannot teach [Tier] sessions"`

**Behavior:**
- Fires whenever Instructor or Tier changes.
- Uses cached instructor reference data; no extra API call.
- Does not block submit — scheduler may intentionally override.

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
2. DayColumn calculates clicked time (snapped to 60-min); checks availability intervals
   covering that time to extract instructorId, vehicleId, and location
3. CalendarPage opens AppointmentSidebar in create mode, passing a `prefill` object:
   { startDate, startTime, instructorId?, carId?, locationId? }
4. AppointmentForm reads prefill (not record) so isEdit = false; pre-populates
   Date, Start Time, Instructor, Car, and Location fields
5. User fills in Student, Course, and any remaining fields
6. AppointmentForm.onSubmit():
   - Combines Date + Time inputs into a single ISO string for Start
   - Wraps linked record IDs in arrays: [recId]
   - Strips undefined / empty fields
7. useCreateAppointment.mutateAsync(fields) → POST to Airtable
8. Airtable computes End, Pickup At, Dropoff At formulas
9. TanStack Query invalidates appointments cache
10. useAppointments re-fetches the year → UI updates
```

### Request Flow — Editing an Appointment

```
1. User clicks appointment block (calendar) → opens AppointmentSidebar in edit mode
   or clicks pencil icon (table) → opens AppointmentModal in edit mode
2. AppointmentForm.defaultValues():
   - Extracts first element from linked record arrays
   - Splits Start ISO string into separate date / time inputs
3. User modifies fields and submits
4. Same transformations as create (step 6 above)
5. useUpdateAppointment.mutateAsync({ recordId, fields }) → PATCH to Airtable
6. Cache invalidated → UI updates
```

### Request Flow — Loading Reference Data

```
1. App mounts → useReferenceData() runs 4 parallel queries
2. Fetches: Instructors, Students, Cars, Courses
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

| Field Name | Field ID | Type | Notes |
|-----------|---------|------|-------|
| Instructor | `fldUao9vyLTkkqAsh` | multipleRecordLinks | Linked instructor. For `Blocked Off`, may be left blank to create a vehicle-only block. |
| Vehicle | `fld6xoS3XDdBdX3Qd` | multipleRecordLinks | Linked car. For `Blocked Off`, may be left blank to create an instructor-only block. |
| Location | `fld3hPPZq6RjQfEHo` | singleSelect | `"CH"` (Colonial Heights) or `"GA"` (Glen Allen) |
| Status | `fldQTPMjnjTLbAgN6` | singleSelect | `"Scheduled"` or `"Blocked Off"` |
| Start | `fldsvwUb7vY8JVwQr` | dateTime | Shift start datetime |
| Shift Length | `flddlnzPypEaaDQnW` | duration (seconds) | Duration of the shift |
| End | `fld9AfRH5dykYArQv` | dateTime formula | Read-only |
| Classroom | `fld7YPZifR1Hn21EB` | singleSelect | `"Class Room 1"` or `"Class Room 2"`; optional |
| Notes | `fldgdmX4a44WOaT2i` | multilineText | Free text |
| Cadence | `flddEcAhjU8RvIFlJ` | singleSelect | `"Weekly"` or `"Bi-Weekly"` — legacy, no longer written |
| Repeate Until | `fldqclSXT33dNYKLq` | date | Legacy — no longer written (typo baked into Airtable) |

For `Status = "Blocked Off"` records:
- At least one of `Instructor` or `Vehicle` should be populated.
- If both are populated, the block is pair-specific.
- If only one is populated, the block applies broadly to that resource across pairings.

