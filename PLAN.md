# Plan — CDS Appointment Tool (React Web App)

> Agreed plan for building the appointment management UI. Update checkboxes as work progresses.

## Context

CDS needs a web UI to view and manage driving appointments stored in Airtable. The repo currently has only Node.js data scripts. This plan adds a React/Vite app in `app/` that talks to Airtable directly from the browser.

## Goals

- [x] Table view of all appointments (sortable, filterable, user-defined date range)
- [x] Add / Edit appointment form (dynamic fields based on Course, Class # auto-calc, bulk scheduling, conflict detection)
- [x] Calendar year-scroll view (all weeks stacked, By Car lane layout, axis zoom, instructor availability overlay)
- [x] Conflict detection: student / instructor / car double-booking with inline errors

## Non-Goals

- No backend server / proxy — API calls go direct to Airtable from browser
- No authentication layer (internal tool)
- No mobile-first design (desktop-first)

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

## Phased Plan

### Phase 1 — Scaffold + Data Layer
- [x] `npm create vite@latest app -- --template react`
- [x] Install: `react-router-dom @tanstack/react-query date-fns`
- [x] Install and init shadcn/ui + Tailwind
- [x] `app/src/utils/constants.js` — all table IDs and field IDs
- [x] `app/src/airtable/client.js` — GET/POST/PATCH fetch wrapper
- [x] `app/src/airtable/` — 5 table modules (appointments, students, instructors, vehicles, courses)
- [x] `app/src/hooks/useReferenceData.js` — parallel fetch, builds lookup maps
- [x] `app/src/hooks/useAppointments.js` — week-scoped query
- [x] Smoke-test: verify data loads in browser devtools

### Phase 2 — Table View
- [x] `AppShell` with nav tabs (Calendar | Table)
- [x] `AppointmentTable` — shadcn Table, resolve names from reference maps, sortable columns
- [x] `TableFilters` — filter by instructor, location
- [x] Route `/table`

### Phase 3 — Add / Edit Form
- [x] `AppointmentModal` (shadcn Dialog, create vs edit mode)
- [x] `AppointmentForm` with React Hook Form
- [x] `LinkedSelect` reusable dropdown component
- [x] Create path: POST → invalidate cache
- [x] Edit path: pre-fill from record → PATCH → invalidate
- [x] "New Appointment" button

### Phase 4 — Calendar Week View
- [x] `WeekNav` (prev / next / today, Monday-anchored week)
- [x] `WeekCalendar` CSS grid + overlap resolver
- [x] `TimeGutter` (6 AM – 9 PM)
- [x] `DayColumn` + `AppointmentBlock` (positioned by time math, instructor color)
- [x] Click block → edit modal; click empty space → create modal with time pre-filled
- [x] Route `/` (default)

### Phase 5 — Polish
- [x] Loading skeletons + error toasts (`Sonner`)
- [x] Delete confirmation dialog
- [ ] Update `docs/DEV_SETUP.md` with app setup
- [ ] Add `app:dev` npm script to root `package.json`

---

### Phase 6 — Table View Overhaul
- [x] Replace week-navigation + instructor/location filters with start-date + end-date inputs
- [x] Default date range: today → +1 month
- [x] `useAppointments` hook: change from week-scoped to date-range-scoped query
- [x] Remove `TableFilters` week nav, Today button, instructor dropdown, location dropdown
- [x] Remove instructor/location filter logic from `TablePage`

### Phase 7 — Calendar Overhaul (superseded by Phase 11)

#### 7a — Time Range Modes *(superseded — replaced by always-on year scroll)*
- [x] `DAY_START_HOUR` updated to 8 AM in `time.js`
- [x] Stacked week rows with time grid per week

#### 7b — Axis Zoom *(superseded by double-click zoom mode in Phase 11)*
- [x] Both zoom values stored in component state, persist while on calendar page
- [x] Calendar height and block positions recompute reactively from zoom state

#### 7c — Lane Layout *(By Car only — By Instructor removed)*
- [x] By Car: lane-per-car layout; "No Car" lane at right for unassigned
- [x] Within-lane time overlaps handled by sub-cluster algorithm
- [x] Appointment block color is instructor-based
- [x] Click-to-create snaps to 60-min increments

### Phase 8 — Appointment Form Redesign

#### 8a — Field Restructure
- [x] Reorder fields: Student → Course → Instructor → Date → Start Time → End Time (read-only)
- [x] Split existing `datetime-local` into separate Date picker + Time picker
- [x] Display computed End Time as read-only (derived from Start + Course.Length + 2×PUDO)
- [x] Remove `Vehicle` field (replaced by conditional Car / Classroom fields below)
- [x] Default Date to today in create mode
- [x] Default Start Time to 8:00 AM in create mode
- [x] Course dropdown label uses the Lookup field from Courses table (not raw name field)

#### 8b — Conditional Fields (Course-Driven)
- [x] On Course select: fetch that course's lookup fields (`Type`, `Age Options`, `Tier Options`, `Locations Options`, `Spanish Offered`, `PUDO Offered`)
- [x] Show **Car** (LinkedSelect) when `Type` = `"In Car"` (default when no course selected)
- [x] Show **Classroom** (select: `"Class Room 1"`, `"Class Room 2"`) when `Type` = `"Classroom"`
- [x] Show **Age** (select from `Age Options` lookup: `T`, `A`) when `Age Options` is non-empty
- [x] Show **Tier** (select: blank + values from `Tier Options` lookup: `EL`, `RL`) when `Tier Options` is non-empty; default blank
- [x] Show **Location** (select from `Locations Options` lookup: `CH`, `GA`) when `Locations Options` is non-empty; default `CH`
- [x] Show **Spanish** (checkbox) when `Spanish Offered` = true
- [x] Show **PUDO** (select: `""`, `0:30`, `1:00`) when `PUDO Offered` = true
- [x] Write new fields to Schedule table: `Classroom`, `Age`, `Tier`, `Spanish` (add field IDs to `constants.js`)

#### 8c — Class Number Auto-Calculation
- [x] When Student + Course are both selected, query existing appointments for that student + course
- [x] Set `Class Number` = max existing + 1 (default 1 if none found)
- [x] Show auto-calculated value in form; allow manual override

#### 8d — Bulk Scheduling
- [x] Button order in form footer: Cancel — Bulk Schedule — Create Appointment (Bulk Schedule between Cancel and primary action)
- [x] Replace single submit button with **"Schedule One"** / **"Bulk Schedule"** choice
- [x] Bulk: show number input for quantity → generate N drafts offset by +1 week each
- [x] Tabbed / paginated draft navigator ("1 of 5", "2 of 5", etc.)
- [x] Class Numbers auto-increment across bulk set
- [x] Any draft with a validation error highlights its tab red and blocks overall submit
- [x] On confirm: parallel POST requests for all drafts

### Phase 9 — Conflict Detection

- [x] On field change (Student, Instructor, Car, Date, Start): check cached appointments for overlap with computed time range
- [x] E1 — Student double-booking: glow Student + Date + Start fields red; show conflicting appointment details
- [x] E2 — Instructor double-booking: glow Instructor + Date + Start fields red; show conflicting appointment details
- [x] E3 — Car double-booking: glow Car + Date + Start fields red; show conflicting appointment details (In Car only)
- [x] E4 — Missing required field: standard required-field validation (via react-hook-form required rules)
- [x] E5 — Bulk partial conflict: highlight offending draft tab red; block overall submit
- [x] Final gate validation on submit (catches anything missed by eager checks)
- [x] Use 2-min appointments cache for conflict checks; no extra API call if cache is warm

### Phase 9b — Availability Warnings & Car Auto-Population

- [x] Car field is required for In Car courses (E4 blocks submit if empty)
- [x] W1 — Instructor not available at proposed time: glow Instructor + Date + Start **orange**; warning message; does not block submit
- [x] W2 — Car not in instructor's availability window: glow Car **orange**; warning message; does not block submit
- [x] Auto-populate Car from instructor's availability window when Car is empty and Instructor + Date + Start are all set
- [x] Wire `useAvailability` into `AppointmentForm`; pass availability records down for eager warning checks
- [x] Add `checkAvailabilityWarnings()` to `conflicts.js` using `expandAvailability()` util
- [x] Orange ring style for warning fields (distinct from red error ring)
- [x] Warning messages rendered below fields (same location as error messages but amber/orange color)

### Phase 10 — Instructor Availability Overlay

- [x] Add `useAvailability(startDate, endDate)` hook — fetch Availability table records, cache 2 min
- [x] Add `app/src/airtable/availability.js` — fetch all availability records for the visible date range
- [x] Add availability field IDs to `constants.js`: `AVAIL_FIELDS` (instructorId, vehicleId, status, start, shiftLength, end, cadence, repeateUntil)
- [x] Write `expandAvailability(records, targetDate)` utility — expands `Scheduled` recurrences (Weekly / Bi-Weekly) to the target date, subtracts `Blocked Off` intervals, returns `[{ instructorId, vehicleId, start, end }]`
- [x] Add `AvailabilityOverlay` component — renders translucent instructor-colored background strips in `DayColumn` for each available interval
- [x] Integrate overlay into `DayColumn`: pass availability intervals as prop; render behind appointment blocks (low z-index)
- [x] Availability strips clip to each car's lane; no-car availability strips clip to the unassigned sub-lane for their instructor
- [x] Tooltip on hover: `"Instructor Name — Car Name — 9:00 AM – 5:00 PM"` (using `title` attribute or tooltip component)
- [x] Pass availability data down through `CalendarGrid` → `DayColumn`

### Phase 11 — Calendar UX Overhaul

- [x] Remove Tight grouping and By Instructor — By Car only
- [x] Remove Day / Week / Month / Year mode toggles — calendar always shows all weeks of the year (stacked)
- [x] Scroll-based week tracking: `IntersectionObserver` updates the nav label as the user scrolls
- [x] Nav arrow buttons and Today scroll to the target week (smooth) and lock the observer during transit
- [x] Availability lane seeding: `resolveByLane` accepts `seedLaneKeys` so days with only availability (no appointments) still show N distinct non-overlapping lanes
- [x] Zoom scroll lock: `wheel` listener with `{ passive: false }` on scroll container blocks page scroll while zoom mode is active; gutter/header wheel handlers call `stopImmediatePropagation` to avoid double-handling
- [x] Remove week start label from left gutter (`"Jan 5"` text removed)
- [x] Fetch full year of appointments upfront so scrolling never triggers a new fetch
- [x] Double-click zoom mode: double-click gutter → vertical zoom, double-click header → horizontal zoom; Esc or click exits; blue ring shows active mode
- [x] Zoom ranges expanded: vertical 20–600 px/hr, horizontal 60–1200 px/col

### Phase 12 — No-Car Sub-Lane Layout

- [x] In **By Car** mode, appointments and availability with no car assigned share a dedicated "No Car" lane at the right
- [x] Within the No Car lane, each instructor gets their own equal-width sub-lane (not stacked on top of each other)
- [x] Sub-lanes seeded from no-car availability intervals so empty days still show the correct number of sub-lanes
- [x] `resolveByLane` accepts `seedUnassignedKeys` for seeding the unassigned lane's sub-division
- [x] `resolveByCar` accepts `seedNoCarInstructorKeys` and forwards them as `seedUnassignedKeys`
- [x] Availability overlay geometry for no-car intervals correctly clips to each instructor's sub-lane within the No Car lane

### Phase 13 — Drag-to-Resize Zoom + Day Popout + Date Picker

#### 13a — Drag-to-Resize Axis Zoom
- [x] Add drag handle on the right border of each day column header — dragging resizes all columns simultaneously (uniform width)
- [x] Add drag handle on the right border of the time gutter — dragging resizes the gutter width independently
- [x] Cursor changes to `col-resize` on hover over either handle
- [x] Enforce min/max: column 60–1200 px, gutter 40–200 px
- [x] Drag zoom coexists with existing double-click scroll-wheel zoom; both write to the same column/gutter width state

#### 13b — Day Popout
- [x] Double-click a day column header opens that day in a full-width modal/overlay (Day Popout)
- [x] Popout renders the same time grid and appointment blocks as the main calendar, using full available width
- [x] Popout has its own independent `PX_PER_HOUR` zoom state (does not affect main calendar zoom)
- [x] Escape key or × button closes the popout; returns to calendar with main-view state unchanged
- [x] Click-to-create and click-to-edit work inside the popout the same as in the main calendar

#### 13c — Calendar Date Picker
- [x] Clicking the week range label (or date chips) in the week selector opens an inline calendar picker
- [x] Picker supports month/year navigation for fast forward/backward jumps
- [x] Selecting a date closes the picker and scroll-jumps the calendar to the week containing that date (same behavior as Today button)
- [x] Picker closes on Escape or clicking outside

### Phase 14 — Lane Order + Availability Strip Labels

- [x] Fixed lane order: Car 1 → Car 2 → Car 3 → Car 4 → Car 5 → Class Room 1 → Class Room 2 → unassigned (no car/classroom)
- [x] Classroom appointments occupy their own named lane (keyed by `Classroom` singleSelect value), not the unassigned lane
- [x] Lane keys sorted numerically/alphabetically so new cars/classrooms slot in predictably
- [x] Availability strips show inline text: `{Instructor Name}` on first line, `{Car Name / Classroom}` on second line (when strip is tall enough)
- [x] Hover tooltip: `{Instructor Name}\n{Car Name / Classroom}\n{Start Time – End Time}`
- [x] Empty lanes are omitted — a lane only appears if it has availability intervals or appointments on that day; all available column width is shared among active lanes only

### Phase 15 — Appointment Form: Course-Gated Fields

- [x] Hide Car and Classroom entirely until a Course is selected (no pre-emptive Car field shown)
- [x] Once course selected: show Car if `Type = "In Car"`, show Classroom if `Type = "Classroom"`; never show both
- [x] Class # field only shown when selected Course has `Numbered = true`
- [x] Fetch `Numbered` field from Courses table in `courses.js`
- [x] Car required error (E4) only shows after a submit attempt, not eagerly

### Phase 16 — W2 Contextual Warning Message

- [x] W2 message replaced with up to two lines: "{Instructor} is scheduled for {Their Car} at this time." and "{Selected Car} is scheduled for {Its Instructor} at this time."
- [x] First line omitted if instructor has no covering window with a car linked
- [x] Second line omitted if the selected car is not in any other instructor's window
- [x] Falls back to original message if neither line is available

### Phase 17 — Calendar Click: New Appointment with Availability Pre-fill

- [x] Clicking empty time slot always opens New Appointment form (never Edit)
- [x] Pre-fill Date and Start Time (snapped to nearest hour) from click position
- [x] Pre-fill Instructor from any availability interval covering the clicked time in that column
- [x] Pre-fill Car from that interval's linked vehicle (stored in form state even though Car field is hidden until a course is selected)
- [x] Separate `prefill` prop from `record` prop in AppointmentModal/Form so isEdit is never true for calendar clicks
- [x] DayColumn passes `{ time, instructorId, carId }` up through onCreateAt instead of just `time`

### Phase 18 — Appointment Form as Calendar Sidebar

- [x] On the Calendar view, appointment form opens as a right-side sidebar instead of a modal dialog
- [x] Calendar remains fully visible and scrollable behind the open sidebar
- [x] Sidebar has a fixed width (~420px) and a close (×) button in its header
- [x] When the Date field changes in the sidebar, the calendar navigates to the week containing that date
- [x] Table view continues to use the existing modal dialog (AppointmentModal unchanged)

### Phase 19 — Availability Location

- [x] Add `Location` field (`fld3hPPZq6RjQfEHo`) to `AVAIL_FIELDS` in `constants.js`
- [x] Update `expandAvailability()` in `availability.js` — carry `location` through into each `{ instructorId, vehicleId, location, startMs, endMs }` interval
- [x] Update `AvailabilityOverlay`: show location as a third inline text line (below car name, when strip is tall enough); add to tooltip: `{Instructor}\n{Car}\n{Location}\n{Start – End}`
- [x] Update `AvailabilityOverlay` click handler: include `locationId: iv.location` in the `onClickTime` payload
- [x] Update `CalendarPage` / `DayColumn` / `AvailabilityOverlay` call chain: pass `locationId` through `onClickTime` context; include `locationId` in `prefill` passed to `AppointmentForm`
- [x] Update `AppointmentForm.defaultValues()` create path: use `prefill.locationId` to pre-fill `Location` field
- [x] Add **W3** to `conflicts.js`: instructor's covering availability window has a different location than the selected appointment location — orange warning, does not block submit
- [x] Add **W4** to `conflicts.js`: instructor has another appointment on the same day at a different location within 30 min travel buffer — orange warning, does not block submit
- [x] Wire W3/W4 into `AppointmentForm` — same pattern as W1/W2: run checks eagerly on Instructor, Date, Start Time, Location changes; surface warnings in the form

### Phase 20 — Scoped Block Off Overrides (Instructor-Only / Car-Only)

- [ ] Update `expandAvailability()` in `app/src/utils/availability.js` to support `Blocked Off` scope matching rules:
- [ ] If Blocked Off has both `Instructor` and `Vehicle`: subtract only matching instructor+vehicle intervals
- [ ] If Blocked Off has only `Instructor`: subtract from all scheduled intervals for that instructor (any vehicle)
- [ ] If Blocked Off has only `Vehicle`: subtract from all scheduled intervals for that vehicle (any instructor)
- [ ] If Blocked Off has neither `Instructor` nor `Vehicle`: treat as invalid/no-op (ignore)
- [ ] Preserve current recurrence behavior (`Weekly` / `Bi-Weekly`) and blocked-interval subtraction splitting logic
- [ ] Ensure resulting intervals still carry `location` and lane metadata inputs unchanged for downstream renderers
- [ ] Update availability overlay behavior in `DayColumn` / `AvailabilityOverlay` validation pass to confirm scoped block-offs remove visual windows as expected
- [ ] Update W1/W2/W3 warning computation assumptions in `app/src/utils/conflicts.js` to align with scoped block-off results from `expandAvailability()`
- [ ] Add targeted unit tests for `expandAvailability()` covering:
- [ ] Pair-specific block (Instructor+Vehicle)
- [ ] Instructor-only block across multiple vehicles
- [ ] Vehicle-only block across multiple instructors
- [ ] Partial overlap split and full overlap removal
- [ ] Bi-weekly recurrence with scoped block
- [ ] Invalid block with both links blank (ignored)
- [ ] Add a short QA checklist for manual verification in calendar UI:
- [ ] Create instructor-only block and verify all that instructor’s lanes are removed for the blocked time
- [ ] Create vehicle-only block and verify that car lane is blocked regardless of instructor
- [ ] Verify appointment form W1 warning appears when scoped block removes covering window
- [ ] Verify no regression for existing pair-specific block behavior

### Phase 21 — Appointment Block Content + Tooltip Metadata

- [x] Update `app/src/components/calendar/AppointmentBlock.jsx` to render compact block text:
- [x] Optional meta line: `GA` and/or `PUDO30`/`PUDO60` (omit line if neither)
- [x] Instructor line: full name
- [x] Student line: full name
- [x] Course token line: `Tier-CourseAbbreviationClassNumber` (for example `EL-BTW2`), omit missing pieces
- [x] Remove course name from visible block text (token-only display)
- [x] Expand appointment hover `title` metadata to include:
- [x] `Time`, `Location`, optional `PUDO`, `Instructor`, `Student`, `Car/Classroom`, `Course: ABR - Name`, optional `Class Number`, optional `Tier`, optional `Spanish: True`, optional `Notes`
- [x] Resolve course abbreviation/name from `refData.courseMap` (fallback-safe), and car display from `Car` link or `Classroom` value
- [x] Verify block text still truncates safely and remains readable at small block heights
- [ ] Manual QA: confirm tooltip lines/ordering and conditional omission logic on records with/without GA, PUDO, Tier, Class Number, Spanish, Notes

### Phase 22 — Vertical Zoom via End-of-Day Drag Handle

- [x] Replace vertical zoom interaction from "double-click gutter + wheel" to "drag end-of-day line"
- [x] Add a horizontal drag handle at the bottom boundary of each week grid (end-of-day line)
- [x] Dragging handle down increases vertical scale (`pxPerHour`); dragging up decreases it
- [x] Keep existing vertical min/max bounds (`20..600 px/hr`)
- [x] Remove vertical zoom mode UI state and related gutter double-click/wheel handlers
- [x] Keep horizontal zoom behavior unchanged (double-click header + wheel and column drag)
- [ ] Add manual QA pass: verify resize works smoothly and no scroll-lock regressions

### Phase 23 — Chronological Class Number Sequencing

- [x] Single scheduling class number should use the most recent prior non-canceled/non-no-show match before the proposed `Start` (not global max)
- [x] Update base form auto-calc dependencies to include proposed Date/Start so class # recalculates relative to scheduled date/time
- [x] Edit flow: detect chronology-impacting changes (Student, Course, Start, Class #) and compute future sequence reindex updates
- [x] Edit flow: show warning/confirmation preview of impacted appointments with class-number changes (`old -> new`) before save
- [x] Edit flow: apply additional PATCH updates to impacted future appointments after primary save, keeping numbering chronological
- [x] Bulk flow: maintain drafts in chronological order based on current draft Start values (not static index order)
- [x] Bulk flow: recalculate draft labels/order and class numbers whenever draft Start changes
- [x] Bulk flow: class numbering for each draft follows the same prior-match rule against existing appointments + earlier chronological drafts
- [x] Verify no class numbering is derived from canceled/no-show records

### Phase 24 — Instructor Capability Warnings (Spanish/Tier)

- [x] Add W5 warning when `Spanish = true` and selected instructor is not marked Spanish-capable in Instructors table
- [x] Add W6 warning when appointment `Tier` is set and selected instructor `Tiers` does not include that tier
- [x] Update Airtable instructor fetch to include `Spanish` and `Tiers` fields
- [x] Wire capability warnings into single-form warning pipeline in `AppointmentForm`
- [x] Wire capability warnings into bulk draft warning pipeline in `AppointmentForm`
- [x] Ensure warnings are non-blocking and shown with existing orange warning treatment

### Phase 25 — Additional Classes (Edit Mode Bulk)

- [x] Add "Additional Classes" button to the edit form footer (edit mode only, sits between Cancel and Save Changes)
- [x] Add `additionalClassesMode` state to `AppointmentForm`; toggling it shows/hides the additional classes panel below the form
- [x] In additional classes mode, show a read-only list of all existing non-canceled/non-no-show appointments for the same student+course (sorted chronologically): date, time, instructor name, class # — informational only
- [x] Add a draft count input + draft tabs below the existing list, same UX as Bulk Schedule
- [x] Drafts default to starting from the current appointment's date (+1 week per slot)
- [x] Per-draft override model identical to Bulk Schedule (BulkDraftPanel reused)
- [x] Conflict and warning checks run per-draft, same as Bulk Schedule
- [x] Submitting additional drafts creates only those new appointments; existing appointments are untouched
- [x] "Additional Classes" panel can be dismissed without creating; returns sidebar to normal edit mode
- [x] Submitting additional classes does not close the edit sidebar — user may still save base record edits separately

---

### Phase 26 — Students View

- [x] Add `AppShell` nav tab for **Students** (`/students`)
- [x] Create `app/src/pages/StudentsPage.jsx` — full-width students table + sidebar container
- [x] Add route `/students` in `App.jsx`
- [x] Students table columns: Full Name, Phone, Email, Teen (badge), Address
- [x] Client-side search/filter bar — filters rows by name, phone, or email as user types
- [x] "+ New Student" button in top-right opens sidebar in create mode
- [x] Clicking any student row opens sidebar in edit mode pre-filled with that student's record
- [x] Create `app/src/components/students/StudentForm.jsx` — sidebar form for create and edit
  - [x] **Student Info** fields: First Name (required), Last Name (required), Phone, Email, Address, Teen (checkbox)
  - [x] **Guardian Info** fields: Guardian First Name, Guardian Last Name, Guardian Relation, Guardian Phone, Guardian Email
  - [x] Create mode header: "New Student"; edit mode header: student's full name
  - [x] Delete button in edit mode header — shows confirmation before DELETE
  - [x] Close (×) button; Full Name, Appointments, Record ID, Created, Last Modified are read-only and not shown in form
- [x] Add `createStudent`, `updateStudent`, `deleteStudent` to `app/src/airtable/students.js`
- [x] On create/update/delete: invalidate students cache so table refreshes immediately
- [x] Add student field IDs to `constants.js` (`STUDENT_FIELDS` map)
- [x] Sidebar uses same layout pattern as appointment form sidebar (fixed right, calendar remains scrollable behind it)

### Phase 27 — Availability View

- [x] Add `createAvailability`, `updateAvailability`, `deleteAvailability` to `app/src/airtable/availability.js`
- [x] Create `app/src/hooks/useAvailabilityMutations.js` — CRUD mutation hooks with cache invalidation
- [x] Add `AppShell` nav tab for **Availability** (`/availability`) with `CalendarClock` icon
- [x] Add route `/availability` in `App.jsx`
- [x] Create `app/src/utils/availabilityView.js` — `buildRecurringBlocks()` and `buildWeekBlocks()` data transforms
- [x] Create `app/src/components/availability/AvailabilityToolbar.jsx` — mode toggle (Recurring/Week View), day-of-week selector, week nav, shortcut buttons
- [x] Create `app/src/components/availability/AvailabilityGrid.jsx` — time grid container with resource lane columns
- [x] Create `app/src/components/availability/ResourceColumn.jsx` — single resource lane with hour grid lines and blocks
- [x] Create `app/src/components/availability/AvailabilityBlock.jsx` — positioned block with drag-to-resize (top/bottom edges), 15-min snap
- [x] Create `app/src/components/availability/AvailabilitySidebar.jsx` — sidebar shell following AppointmentSidebar pattern
- [x] Create `app/src/components/availability/AvailabilityForm.jsx` — React Hook Form: Status, Instructor, Vehicle, Location, Day/Date, Start Time, Shift Length, Cadence, Repeate Until
- [x] Create `app/src/components/availability/BlockShortcutDialog.jsx` — bulk Block Instructor (vacation) and Block Car (out of service)
- [x] Create `app/src/pages/AvailabilityPage.jsx` — page component with mode state, sidebar, grid, shortcuts
- [x] Recurring mode: resource lanes (Car 1..N, Unassigned), day-of-week filter, blocks from Scheduled records
- [x] Week View mode: expanded availability after block subtraction, 7 day sub-columns per lane, Blocked Off overlays (striped)
- [x] Click block → edit sidebar; Click empty → create sidebar; Drag edges → resize + auto-save

## Constraints

- Airtable API key goes in `app/.env` as `VITE_AIRTABLE_API_KEY` (Vite prefix required for browser exposure)
- Write operations: linked record fields expect `[recordId]` array format; PUDO stored as seconds; Start as ISO 8601 with Eastern offset; formula fields are read-only
- Field name typos are baked into Airtable: `"Abreviation"` (not Abbreviation), `"PUDO"` for pickup/dropoff duration
- All new code lives in `app/` — existing `scripts/` and root `package.json` are untouched

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| CORS on direct Airtable API calls from browser | Low | Airtable REST API supports browser CORS with Bearer token |
| API key visible in browser bundle | Low | Internal tool only; acceptable tradeoff vs backend complexity |
| Overlapping appointments hard to render | Medium | Overlap resolver algorithm in Phase 4; fallback is simple offset |
| Airtable rate limits (5 req/sec) | Low | Reference data cached 30 min; appointments cached 2 min |

## Verification

- Phase 1: Reference data and appointments log in browser devtools
- Phase 2: All mock appointments visible, sort/filter works
- Phase 3: Create appt → appears in Airtable web UI; edit → persists
- Phase 4: Appointments on correct day/time, instructor colors consistent
- Phase 5: No console errors; error state on missing API key

## Rollback

All new code is in `app/` (new directory). To roll back, delete `app/`. Nothing in the existing repo is modified until Phase 5.
