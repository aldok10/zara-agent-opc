# Information Architecture

Navigation, content types, and search design for developer portals.

## When to Load

- Structuring a new developer documentation site
- Reorganizing existing docs for better discoverability
- Choosing content types and navigation patterns
- Improving search experience in documentation

## Key Concepts

**Content Types** -- Tutorials (learning), How-to Guides (tasks), Reference (information), Explanation (understanding). Each type serves a different user need and reading mode.

**Navigation Hierarchy** -- Maximum 3 levels deep. Top level: product areas or user journeys. Second: specific features. Third: variations or advanced topics. Flat beats deep.

**Progressive Disclosure** -- Show the simple case first. Link to advanced options, edge cases, and configuration. Do not front-load complexity on new users.

**Search** -- Docs search needs: typo tolerance, synonym handling, content-type facets, code-aware tokenization. Algolia DocSearch, Typesense, or built-in framework search.

**Cross-referencing** -- Link related content aggressively. "See also" sections, inline links to reference, breadcrumbs for context. Users rarely enter through the front door.

## Patterns

```
# Navigation structure
docs/
  getting-started/
    quickstart.md
    installation.md
    first-request.md
  guides/
    authentication.md
    pagination.md
    webhooks.md
    error-handling.md
  reference/
    api/
      users.md
      orders.md
      events.md
    sdks/
      node.md
      python.md
      go.md
  concepts/
    architecture.md
    rate-limiting.md
    idempotency.md
```

```yaml
# Search configuration (Algolia DocSearch style)
selectors:
  lvl0: "nav.sidebar .active"
  lvl1: "article h1"
  lvl2: "article h2"
  lvl3: "article h3"
  text: "article p, article li, article pre"
  code: "article code"
custom_settings:
  synonyms:
    - ["auth", "authentication", "login"]
    - ["error", "exception", "failure"]
```

## Gotchas

- Organizing by internal team structure instead of user tasks makes docs unfindable
- Too many top-level navigation items (>7) overwhelm users -- group and collapse
- Search without content-type filters returns reference docs when users want tutorials
- Broken cross-references (link rot) compound over time -- automate link checking
- Versioned docs without a clear "latest" default confuse new users

## Verification

- Can a new user find the quickstart within 2 clicks from any page?
- Does search return relevant results for the top 20 support queries?
- Are all content types represented and clearly distinguishable?
- Do breadcrumbs accurately reflect the user's location?
- Is there a consistent URL structure that humans can predict?
