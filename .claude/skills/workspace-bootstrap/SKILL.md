# Skill: Workspace Bootstrap

## When to Use

Use this skill when you need to:

- **Update documentation** — Keep docs in sync with code changes
- **Refresh STATE.md** — Update current focus, decisions, and milestones after significant work
- **Enforce workflow** — Ensure PRs follow the CONTRIBUTING.md checklist
- **Onboard new contributors** — Walk them through DEV_SETUP.md and ARCHITECTURE.md
- **Log decisions** — Add new entries to DECISIONS.md after architectural choices

## Key Files

| File | Update When... |
|------|---------------|
| `STATE.md` | Focus, decisions, or milestones change |
| `docs/ARCHITECTURE.md` | New modules, data flows, or boundaries added |
| `docs/DECISIONS.md` | A non-trivial technical choice is made |
| `docs/DEV_SETUP.md` | Dependencies, setup steps, or commands change |
| `docs/TESTING.md` | Test strategy or conventions evolve |
| `PLAN.md` | Starting a new work session |

## Checklist

Before ending a session, verify:

- [ ] `STATE.md` reflects current project state
- [ ] Any new decisions are logged in `DECISIONS.md`
- [ ] `DEV_SETUP.md` commands still work
- [ ] `PLAN.md` has been updated or reset for next session
