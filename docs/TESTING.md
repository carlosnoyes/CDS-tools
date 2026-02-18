# Testing Strategy

> How to run, write, and organize tests for CDS-tools.

## Running Tests

```bash
# TODO: Add test command
# e.g., npm test, pytest, make test
```

## Test Pyramid

```
        ╱╲
       ╱ E2E ╲        ← Few, slow, high confidence
      ╱────────╲
     ╱Integration╲    ← Moderate count
    ╱──────────────╲
   ╱   Unit Tests   ╲  ← Many, fast, isolated
  ╱──────────────────╲
```

## How to Add Tests

1. Create test files following the naming convention below
2. <!-- TODO: Describe test file location conventions -->
3. <!-- TODO: Describe any test utilities or fixtures -->

## Naming Conventions

- Test files: `<!-- TODO: e.g., test_*.py, *.test.ts -->`
- Test functions: `<!-- TODO: e.g., test_<description>, it('should ...') -->`

## CI Integration

<!-- TODO: Describe how tests run in CI (GitHub Actions, etc.) -->
