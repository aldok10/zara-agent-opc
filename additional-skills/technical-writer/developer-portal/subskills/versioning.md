# Documentation Versioning

Multi-version docs, end-of-life policies, and migration between doc versions.

## When to Load

- Supporting multiple product versions simultaneously
- Defining EOL policies for documentation
- Setting up version switching in documentation sites
- Planning docs migration between major versions

## Key Concepts

**Multi-version Strategy** -- Approaches: version dropdown (Docusaurus, ReadTheDocs), URL-based (/v1/, /v2/), branch-based (docs live with code), or single-version with callouts for version differences.

**Latest vs Pinned** -- Default users to "latest" unless they explicitly select a version. Search engines should index latest only (noindex on old versions). Canonical URLs point to latest.

**End-of-Life (EOL)** -- Define support windows: active (features + fixes), maintenance (security only), EOL (no updates). Display clear banners on EOL docs directing to current version.

**Migration Between Versions** -- When docs track code: branch at release, maintain patches on release branches. When docs are separate: tag snapshots, generate versioned builds from tags.

## Patterns

```
# URL structure for versioned docs
docs.example.com/               -> latest (redirect)
docs.example.com/v3/            -> current major
docs.example.com/v2/            -> maintenance
docs.example.com/v1/            -> EOL (banner)

# Docusaurus versioning commands
npx docusaurus docs:version 2.0
# Creates versioned_docs/version-2.0/ snapshot
# Current docs/ always represents "next" (unreleased)
```

```yaml
# Version lifecycle policy
versions:
  - version: "3.x"
    status: active
    release_date: 2024-01-01
    eol_date: null
  - version: "2.x"
    status: maintenance
    release_date: 2023-01-01
    eol_date: 2025-01-01
  - version: "1.x"
    status: eol
    release_date: 2021-06-01
    eol_date: 2024-01-01
    redirect_to: "3.x"
```

```html
<!-- EOL banner component -->
<div class="docs-banner docs-banner--eol">
  This documentation is for version 1.x which has reached end-of-life.
  <a href="/v3/migration-from-v1">Migrate to v3</a> or
  <a href="/v3/">view current docs</a>.
</div>
```

## Gotchas

- Maintaining N versions multiplies documentation debt -- limit to 2-3 active versions
- Version dropdowns without clear "recommended" labeling confuse users into picking old versions
- Search indexing all versions creates duplicate content penalties -- use canonical/noindex
- Branch-based versioning makes cross-version content sharing difficult (shared guides, concepts)
- Automated version snapshots without review capture work-in-progress state as "released"

## Verification

- Default URL (no version) resolves to latest stable
- Old version pages display clear deprecation/EOL banners
- Search engines only index the latest version (check robots.txt, canonical tags)
- Version switcher preserves the user's current page when switching (or redirects gracefully)
- Migration guides exist for every major version boundary
