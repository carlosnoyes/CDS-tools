# Contributing

> How to contribute to CDS-tools.

## Branching Strategy

- `main` — stable, production-ready code
- Feature branches: `feature/<short-description>`
- Bug fix branches: `fix/<short-description>`

## Commit Style

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`

**Examples:**
- `feat(parser): add CSV parsing support`
- `fix(cli): handle missing config file gracefully`
- `docs: update DEV_SETUP with new prerequisites`

## Pull Request Checklist

- [ ] Branch is up to date with `main`
- [ ] Code follows project conventions
- [ ] Tests pass locally
- [ ] New functionality has tests
- [ ] Documentation updated if needed
- [ ] PR description explains the "why"

## Code Review Expectations

- Reviews should be constructive and specific
- Approve when satisfied; request changes with clear guidance
- Aim to review within 1 business day
