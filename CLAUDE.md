# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

CDS-tools — a tools repository. This project is in early stages; structure and tooling are still being established.

## Repository

- Remote: https://github.com/carlosnoyes/CDS-tools
- Branch: main

## Project Bootstrap Notes

Key documentation lives in `docs/`:

- [docs/README.md](docs/README.md) — doc index & navigation
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system overview, modules, data flow
- [docs/DECISIONS.md](docs/DECISIONS.md) — lightweight ADR log
- [docs/DEV_SETUP.md](docs/DEV_SETUP.md) — local setup & common commands
- [docs/TESTING.md](docs/TESTING.md) — test strategy & how to add tests
- [docs/RUNBOOK.md](docs/RUNBOOK.md) — incident response & rollback
- [docs/SECURITY.md](docs/SECURITY.md) — security posture & secret handling

Root-level planning files:

- [PLAN.md](PLAN.md) — session plan template
- [STATE.md](STATE.md) — durable project state (fights context rot)
- [CONTRIBUTING.md](CONTRIBUTING.md) — contribution workflow

## Context Management (IMPORTANT)

Claude Code has no memory between sessions — only what's written in these files persists. **Always update the relevant MD file when new information is discovered or decisions are made.** Do not wait to be asked.

### What to save and where

| Type of information | Where to save |
|---------------------|---------------|
| External service schemas (Airtable, APIs, DBs) | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Key IDs, env vars, quick-reference facts | [STATE.md](STATE.md) |
| Architecture or tooling decisions | [docs/DECISIONS.md](docs/DECISIONS.md) |
| Setup steps, commands, credentials structure | [docs/DEV_SETUP.md](docs/DEV_SETUP.md) |
| Security-sensitive notes | [docs/SECURITY.md](docs/SECURITY.md) |
| Current focus and open questions | [STATE.md](STATE.md) |

### Rules

- When you discover a schema, table structure, API shape, or integration detail — write it to [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) immediately.
- When you learn a base ID, table ID, env var name, or other operational fact — add it to [STATE.md](STATE.md).
- When a decision is made about tooling, language, or approach — log it in [docs/DECISIONS.md](docs/DECISIONS.md).
- Keep [STATE.md](STATE.md) as the fast-access summary; keep [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) as the detailed reference.
- Prefer updating existing sections over creating new files.
