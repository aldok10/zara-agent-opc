---
type: tool
title: "Go Project Structure Review"
---

# Go Project Structure Review

## Purpose

Review and design Go project layouts following standard conventions. Evaluates package organization, dependency direction, and module boundaries for maintainability and testability.

## When to Use

- Starting a new Go project and choosing directory layout
- Reviewing an existing project that has grown disorganized
- Deciding between cmd/, internal/, pkg/ placement
- Splitting a monolithic package into smaller packages
- Evaluating whether a module should be one repo or multi-module

## Prompt Template

```
CONTEXT:
- Project type: [CLI tool | HTTP service | library | monorepo | microservice]
- Size: [small (<10 files) | medium (10-50) | large (50+)]
- Team size: [solo | small | large]
- External consumers: [yes (exported pkg/) | no (internal only)]
- Build artifacts: [single binary | multiple binaries | library only]
- Current structure: [describe or paste tree output]

EVALUATE AGAINST CONVENTIONS:
1. cmd/
   - One directory per binary
   - Minimal code (parse flags, wire dependencies, call Run)
   - No business logic in main packages

2. internal/
   - Code not importable by other modules
   - Domain logic, adapters, infrastructure
   - Sub-packages by domain, not by layer

3. pkg/ (use sparingly)
   - Only if genuinely reusable by external consumers
   - Stable API surface, versioned
   - Consider separate module instead

4. Package design
   - Name matches single responsibility (no "utils", "common", "helpers")
   - Dependency direction: domain <- application <- infrastructure
   - Interfaces defined by consumer, not provider
   - Minimal exported surface

5. Module boundaries
   - go.mod at repo root (single module) vs multi-module
   - Replace directives for local development
   - Version strategy for libraries

6. Testing layout
   - _test.go alongside source (same package for white-box)
   - _test package suffix for black-box tests
   - testdata/ for fixtures
   - integration tests in separate build tag

ANTI-PATTERNS:
- Circular imports (symptom of wrong package boundaries)
- Package "models" or "types" (spread types to their domain)
- Deep nesting without purpose
- internal/ with single sub-package (unnecessary layer)
```

## Output Format

```
## Project Structure Review: [project name]

### Current Assessment
[1-2 sentence summary: well-organized / needs restructuring / anti-patterns present]

### Recommended Layout
[ASCII tree with proposed structure]

### Package Moves
| Current Location | Proposed Location | Reason |
|-----------------|-------------------|--------|
| ... | ... | ... |

### Dependency Graph
[Key dependency directions between packages]

### Issues Found
| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| 1 | ... | ... | ... |

### Migration Steps
1. [Ordered steps to restructure safely]
```
