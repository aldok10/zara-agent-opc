# Conventional Commit Examples

## Good Commits

```
feat(auth): add JWT refresh token rotation

Implements automatic token rotation on refresh to prevent replay attacks.
Tokens are invalidated after single use with a 30s grace period.

Closes #142
```

```
fix(api): prevent race condition in order creation

Two concurrent requests could create duplicate orders when the
idempotency check and insert were not atomic. Wrapped in a transaction.
```

```
refactor(db): extract connection pooling to shared module

No behavior change. Moves pool config from 4 services into a single
reusable module to reduce drift between service configurations.
```

```
docs(readme): add local development setup instructions
```

```
chore(deps): bump express from 4.18.2 to 4.19.0
```

## Bad Commits (with fixes)

| Bad | Why | Better |
|-----|-----|--------|
| `fix bug` | No scope, no description of what was fixed | `fix(cart): correct quantity validation on update` |
| `WIP` | Not meaningful, should be squashed before merge | `feat(search): add fuzzy matching for product names` |
| `update files` | Says nothing about intent or impact | `refactor(config): split env vars into per-service files` |
| `Fix #234` | No type, no human-readable description | `fix(payments): handle timeout on provider callback (#234)` |
| `feat: Add new feature for users` | Redundant ("new feature"), no specifics | `feat(users): allow bulk CSV import for admin panel` |

## Scope Conventions

Choose scopes from your project's module boundaries:

- **Monorepo**: package name (`feat(api):`, `fix(web):`)
- **Single app**: module or domain (`feat(auth):`, `fix(billing):`)
- **Infra**: resource type (`chore(terraform):`, `ci(github-actions):`)

## Breaking Changes

```
feat(api)!: remove deprecated v1 endpoints

BREAKING CHANGE: All /v1/* routes now return 410 Gone.
Clients must migrate to /v2/* equivalents. See migration guide
in docs/v2-migration.md.
```
