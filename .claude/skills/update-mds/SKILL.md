---
name: update-mds
description: Full documentation refresh for CDS-tools. Reads all source files and live Airtable schema, then updates STATE.md, docs/ARCHITECTURE.md, docs/LOGIC.md, and PLAN.md to be current and accurate. Clears completed tasks from PLAN.md and resets numbering. Run at the start of a new session or after significant changes.
allowed-tools: Read, Edit, Write, Glob, Grep, mcp__airtable__list_tables, mcp__airtable__describe_table
---

# Update MD Files

Your job is to perform a full documentation refresh for the CDS-tools project. You will read the live codebase and Airtable schema, then update all four documentation files to be current and accurate.

Do not rewrite content that is still correct. Make targeted edits only. Do not add speculation or future plans — only document what actually exists.

---

## Step 1 — Read current documentation

Read all four files to understand what is currently documented:

1. `STATE.md`
2. `PLAN.md`
3. `docs/ARCHITECTURE.md`
4. `docs/LOGIC.md`

---

## Step 2 — Fetch live Airtable schema

Call the Airtable MCP to get ground truth on the base schema. **Base ID: `appfmh7j77kCe8hy2`**

1. Call `list_tables` with `baseId: "appfmh7j77kCe8hy2"` and `detailLevel: "identifiersOnly"` to get all table names, IDs, field names, and field IDs.
2. For any active table whose schema may have changed (compare field list to `docs/ARCHITECTURE.md`), call `describe_table` with `detailLevel: "full"` to get complete field types and option values.
3. Skip full describe for: "Students - Old", "Courses - Old", "Emails - Old", "Template Table" — just confirm they still exist.

---

## Step 3 — Read the codebase

Read these files to understand the current state of the app:

- `app/src/App.jsx` — routes (pages and paths)
- `app/src/utils/constants.js` — all field IDs, table IDs, constants
- `app/src/airtable/instructors.js` — which instructor fields are fetched
- `app/src/utils/conflicts.js` — exact warning/error messages and trigger logic
- `app/src/utils/availability.js` — `expandAvailability()` algorithm

Use `Glob` to list `app/src/**/*.{js,jsx}` if you need to verify what files exist. Use `Grep` to spot-check specific details (e.g., field names, function signatures).

---

## Step 4 — Update STATE.md

STATE.md is the fast-access summary. Keep it concise. Update:

- **Current Focus** — update to reflect what work is actually next (look at PLAN.md's first unchecked items)
- **App Structure** — update the file tree if new components, hooks, or utils were added
- **Airtable Quick Reference table** — update `Last synced` date to today; fix any stale table names or IDs
- **Table IDs** — add/remove/rename any tables that changed
- **Schema Notes** — update or remove any notes that are now wrong; add notes for newly discovered field-name quirks or breaking changes
- **Key Constants** — update if new exported constants were added to `constants.js`
- **Last Verified Commands** — update the date on the dev command if still working

Remove any sections or notes that are no longer accurate. Do not add open questions or future plans here.

---

## Step 5 — Update docs/ARCHITECTURE.md

ARCHITECTURE.md is the detailed reference. Update:

### Airtable Base section

Compare the live schema (Step 2) against the current docs. For each active table, check:

- Any fields added, removed, or renamed → update the field table for that table
- Any field types changed → update Type column
- Any singleSelect options added/removed → update Notes with option names and IDs
- Any formula expressions changed → update Notes
- Any new relationships (multipleRecordLinks) → update Key Relationships table
- Update `**Last synced:**` date at the top of the Airtable Base section to today

### Module/Key Modules section

- Add any new airtable modules, hooks, utils, or pages that exist in the codebase but aren't documented
- Remove references to files that no longer exist
- Update route table if routes changed in `App.jsx`

### Do not change

- Field IDs that match what the live API returned
- Typos baked into Airtable (e.g., "Abreviation", "Serivces", "Repeate Until") — keep with `(note: typo is in Airtable)` annotation
- Legacy table documentation unless the table was actually deleted

---

## Step 6 — Update docs/LOGIC.md

LOGIC.md documents how things work — UX flows, algorithms, validation rules, data transformations. Update:

### Check these sections against the source code:

- **Instructors reference table** — fields must match what `instructors.js` actually fetches (currently: `First Name`, `Last Name`, `Role`, `Spanish`, `Tiers` — `Capabilities` was removed)
- **Availability algorithm** — must match `expandAvailability()` in `app/src/utils/availability.js`; verify the scoped block-off rules (instructor-only, vehicle-only, pair-specific) are described accurately
- **Error and warning messages (E1–W6)** — must match the exact strings in `conflicts.js`; check each `message:` field
- **W2 message wording** — verify the two contextual lines match the actual code
- **W5 trigger** — verify it checks `instructor.Spanish === true` (not the old `Capabilities` field)
- **W6 trigger** — verify it checks `instructor.Tiers` (multiselect array)
- **Request flows** — verify component names are correct (e.g., calendar uses `AppointmentSidebar`, table uses `AppointmentModal`; prefill includes `locationId`)
- **Overlap resolution** — must reflect By Car only (By Instructor was removed in Phase 11); verify lane order (Car 1→N, Class Room 1→2, No Car)
- **Reference data** — verify the list of fetched tables is correct (Instructors, Students, Cars, Courses — not "Vehicles")
- **Table View columns** — must say "Car" not "Vehicle"
- **Availability field IDs at the bottom** — verify `Cadence` options are only "Weekly" and "Bi-Weekly" (no "Daily")

Only update sections where the docs differ from the code. Do not rewrite sections that are already accurate.

---

## Step 7 — Update PLAN.md

PLAN.md tracks active work only. Completed phases should not be here.

1. **Read the current PLAN.md** and identify any tasks that are checked `[x]` or whose phases are fully complete.
2. **Remove all completed tasks** — entire phases where every item is checked, or individual checked items within otherwise active phases.
3. **Keep only unchecked `[ ]` items** — these are the actual remaining work.
4. **Renumber remaining phases** starting from Phase 1.
5. **Update the Context section** at the top to accurately describe what has been completed and what the current focus is.
6. Do not invent new tasks. Do not add items that weren't already in the plan unless they are clearly implied by unchecked work.

---

## Step 8 — Report

After all updates are complete, give a concise summary:

- **STATE.md**: what changed
- **docs/ARCHITECTURE.md**: what schema changes were found and documented
- **docs/LOGIC.md**: which sections were updated and why
- **PLAN.md**: how many phases/items were removed, what remains

---

## Rules

- **Do not guess** — only document what the live API and source files actually show
- **Preserve field IDs exactly** as returned by the Airtable MCP (e.g., `fldXXXXXXXXXX`)
- **Preserve Airtable typos** ("Abreviation", "Serivces Abreviation", "Repeate Until") — they must match exactly for API calls to work
- **Make targeted edits** — do not rewrite sections that are already correct
- **Do not batch completions** — update one file at a time and mark each done before moving to the next
- **Today's date** is available from the system prompt — use it for "Last synced" and "Last updated" timestamps
