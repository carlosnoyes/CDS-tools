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
