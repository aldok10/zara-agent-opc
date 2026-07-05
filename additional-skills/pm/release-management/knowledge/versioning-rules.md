# Versioning Rules

## Decision Table

| Change | Bump | Rationale |
|--------|------|-----------|
| Remove public endpoint | MAJOR | Breaks existing callers |
| Rename field in response | MAJOR | Breaks parsers |
| Change field type (string→int) | MAJOR | Breaks deserialization |
| Add required request field | MAJOR | Breaks existing requests |
| Change default value (behavior differs) | MAJOR | Silent behavior change |
| Remove enum value | MAJOR | Breaks callers using that value |
| Add new endpoint | MINOR | Additive, non-breaking |
| Add optional request field | MINOR | Existing requests still valid |
| Add field to response | MINOR | Additive, non-breaking |
| Add new enum value | MINOR | Existing values still work |
| Deprecate (not remove) endpoint | MINOR | Still functional |
| Fix incorrect calculation | PATCH | Bug fix |
| Fix typo in response field value | PATCH | Correction |
| Performance improvement, same behavior | PATCH | No API change |
| Update error message text | PATCH | Unless consumers parse it |
| Internal refactor, same behavior | NONE | No observable change |
| Update docs/comments only | NONE | No code change |
| CI/CD pipeline change | NONE | No artifact change |

## Edge Cases

- Adding validation that rejects previously-accepted input: MAJOR.
- Changing rate limits: MINOR (document in changelog).
- Fixing security vulnerability: PATCH + advisory.
- Changing pagination defaults: MAJOR if consumers rely on default page size.
- Adding new required header: MAJOR (breaks existing callers).

## Conventional Commit → Version

```
fix: correct tax calculation          → PATCH (0.1.0 → 0.1.1)
feat: add bulk import endpoint        → MINOR (0.1.1 → 0.2.0)
feat!: remove v1 auth endpoints       → MAJOR (0.2.0 → 1.0.0)
fix: typo in error message            → PATCH
chore: update CI config               → NO BUMP
docs: update API guide                → NO BUMP
perf: optimize query performance      → PATCH
refactor: extract service class       → NO BUMP (if no behavior change)
```

## Pre-1.0 Rules

Before 1.0.0: API is unstable. MINOR can contain breaking changes. Use 0.x for early development. Graduate to 1.0.0 when API contract is stable and has external consumers.
