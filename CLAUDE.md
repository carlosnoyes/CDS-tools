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
- [docs/references/](docs/references/) — reference documents pulled during work (see [docs/REFERENCES.md](docs/REFERENCES.md))

Root-level planning files:

- [PLAN.md](PLAN.md) — session plan template
- [STATE.md](STATE.md) — durable project state (fights context rot)

Claude Code config:

- [.mcp.json](.mcp.json) — MCP server definitions (Airtable, etc.)
- [.claude/settings.json](.claude/settings.json) — hooks skeleton
- [.claude/skills/](claude/skills/) — project skills (`sync-airtable-schema`, `new-skill`)

## Context Management (IMPORTANT)

Claude Code has no memory between sessions — only what's written in these files persists. **Always update the relevant MD file when new information is discovered or decisions are made.** Do not wait to be asked.

Anytime you pull reference documents to assist in accomplishing a task, save them in the docs/references/ dir. Then update the docs/REFERENCES.md.

### What to save and where

| Type of information | Where to save |
|---------------------|---------------|
| External service schemas (Airtable, APIs, DBs) | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Key IDs, env vars, quick-reference facts | [STATE.md](STATE.md) |
| Current focus and open questions | [STATE.md](STATE.md) |
| Reference docs pulled mid-task | [docs/references/](docs/references/) + log in [docs/REFERENCES.md](docs/REFERENCES.md) |

### Rules

- When you discover a schema, table structure, API shape, or integration detail — write it to [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) immediately.
- When you learn a base ID, table ID, env var name, or other operational fact — add it to [STATE.md](STATE.md).
- Keep [STATE.md](STATE.md) as the fast-access summary; keep [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) as the detailed reference.
- When you pull a reference document mid-task, save it in [docs/references/](docs/references/) and log it in [docs/REFERENCES.md](docs/REFERENCES.md).
- Prefer updating existing sections over creating new files.
- Mark completed steps in [PLAN.md](PLAN.md) as each one is finished — do not batch updates. Check off items incrementally as work progresses, not at the end of a session.
