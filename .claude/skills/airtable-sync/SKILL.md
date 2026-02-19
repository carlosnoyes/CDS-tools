---
name: airtable-sync
description: Use the Airtable MCP to read the live base schema and update docs/ARCHITECTURE.md and STATE.md to match. Run this whenever the Airtable base structure changes.
allowed-tools: Read, Edit, Write, mcp__airtable__list_bases, mcp__airtable__list_tables, mcp__airtable__describe_table
---

# Sync Airtable Schema

Your job is to read the live Airtable base schema via the Airtable MCP and reconcile it with the project's documentation. You are NOT just reading files — you are calling the live Airtable API to get ground truth.

## Base to Sync

**Base ID:** `appfmh7j77kCe8hy2`
**Base name:** Colonial Driving School - Carlos

## Step 1 — Fetch live schema

Call the Airtable MCP to get the current state of the base:

1. Call `list_tables` with `baseId: "appfmh7j77kCe8hy2"` and `detailLevel: "identifiersOnly"` to get all table names and IDs.
2. For each table that is **not** a legacy table (i.e., not "Students - Old", "Courses - Old", "Emails - Old", "Template Table"), call `describe_table` with `detailLevel: "full"` to get all field names, IDs, and types.
3. For legacy tables, just confirm they still exist — no need to re-fetch their full schema unless it changed.

## Step 2 — Read current docs

Read `docs/ARCHITECTURE.md` and `STATE.md` to understand what is currently documented.

## Step 3 — Diff and identify changes

Compare the live schema against the docs. Look for:

- New tables added (not in docs)
- Tables deleted or renamed
- New fields added to existing tables (including new field IDs, types, notes)
- Fields removed or renamed
- Changed field types
- New relationships (multipleRecordLinks fields)
- Changes to singleSelect option values (names and IDs)
- Changes to formula field expressions

## Step 4 — Update docs/ARCHITECTURE.md

Update the **Airtable Base** section of `docs/ARCHITECTURE.md` to reflect what you found. Follow the existing table and field documentation style exactly:

- Tables table: ID, Status (Active/Legacy/Reference), Purpose
- Per-table field tables: Field name, Field ID, Type, Notes
- Key Relationships table: From, Field, To, Inverse Field
- For singleSelect fields: document option names and IDs inline in Notes
- For formula fields: document the formula expression in Notes
- For lookup fields: document what they look up in Notes
- Mark fields as "read only" if they are formula, lookup, or computed
- Update the `**Last synced:**` date at the top of the Airtable Base section to today's date

If a table is newly built out (was previously stub-only), move it to the "Fully built tables" category.

## Step 5 — Update STATE.md

In STATE.md, update:

- The `Fully built tables` row in the Airtable Quick Reference table (if any tables graduated from stub to built)
- The `Stub-only tables` row (if any stubs were built out or new stubs added)
- The `Active (new) tables` row (if new tables were added)
- Any per-table schema sections (e.g., `## Appointments — Schema`) if their schemas changed
- The `**Last synced:**` date in the Quick Reference table

## Step 6 — Report

After updating the docs, give a concise summary of:

- What changed (new tables, new fields, removed fields, etc.)
- What you updated in each doc file
- Anything ambiguous or that needs human review (e.g., a field whose purpose is unclear)

## Important Rules

- **Do not guess or interpolate** — only document what the live API actually returns
- **Preserve field IDs exactly** as returned by the API (e.g., `fldXXXXXXXXXX`)
- **Preserve typos** that exist in Airtable (e.g., "Abreviation", "Serivces", "Repeate Until") — document them with a `(note: typo is in Airtable)` annotation
- **Do not remove** legacy table documentation unless the table was actually deleted from the base
- **Do not rewrite** sections that didn't change — make targeted edits only
- **Update the date** on `**Last synced:**` to today: 2026-02-19
