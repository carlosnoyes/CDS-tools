# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

CDS-tools — a React/Vite web app for managing driving school appointments at Colonial Driving School. The app talks directly to Airtable from the browser (no backend). It has four views: Calendar, Table, Students, and Availability.

**Run:** `cd app && npm run dev`

## Repository

- Remote: https://github.com/carlosnoyes/CDS-tools
- Branch: main

## Key Documentation

| File | Purpose |
|------|---------|
| [STATE.md](STATE.md) | Current focus, quick-reference IDs, schema notes — read this first each session |
| [PLAN.md](PLAN.md) | Active work plan — open tasks only, completed phases removed |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Full Airtable schema (all tables, field IDs, relationships), module map, tech stack |
| [docs/LOGIC.md](docs/LOGIC.md) | How things work — UX flows, validation rules, algorithms, data transformations |
| [docs/REFERENCES.md](docs/REFERENCES.md) | Log of reference documents pulled during work |
| [docs/references/](docs/references/) | Saved reference documents |

## Claude Code Config

- [.mcp.json](.mcp.json) — MCP server definitions (Airtable)
- [.claude/settings.json](.claude/settings.json) — hooks and permissions
- [.claude/skills/](.claude/skills/) — project skills (see Project Skills below)

## Project Skills

Skills are slash commands available in this project. Invoke with `/skill-name`.

| Skill | Invoke | What it does |
|-------|--------|-------------|
| `airtable-sync` | `/airtable-sync` | Fetches live Airtable base schema via MCP and updates `docs/ARCHITECTURE.md` and `STATE.md` to match. Run whenever the Airtable base structure changes. |
| `new-skill` | `/new-skill [name] [description]` | Designs and writes a new Claude Code skill (slash command) for this project. Researches the tool surface before writing. |

Skill files live at `.claude/skills/<skill-name>/SKILL.md`.

## Context Management (IMPORTANT)

Claude Code has no memory between sessions — only what's written in these files persists. **Always update the relevant MD file when new information is discovered or decisions are made.** Do not wait to be asked.

When you pull reference documents to assist with a task, save them in `docs/references/` and log them in `docs/REFERENCES.md`.

### What to save and where

| Type of information | Where to save |
|---------------------|---------------|
| Airtable schema, field IDs, table structure | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| UX flows, validation logic, algorithms | [docs/LOGIC.md](docs/LOGIC.md) |
| Current focus, key IDs, quick-reference facts | [STATE.md](STATE.md) |
| Reference docs pulled mid-task | [docs/references/](docs/references/) + log in [docs/REFERENCES.md](docs/REFERENCES.md) |

### Rules

- When you discover a schema change, field ID, or Airtable detail — update [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) immediately.
- When you learn a base ID, table ID, env var, or other operational fact — add it to [STATE.md](STATE.md).
- When logic, UX behavior, or validation rules change — update [docs/LOGIC.md](docs/LOGIC.md).
- Keep [STATE.md](STATE.md) as the fast-access summary; keep the `docs/` files as the detailed references.
- Prefer updating existing sections over creating new files.
- Mark completed steps in [PLAN.md](PLAN.md) as each one is finished — do not batch updates.
