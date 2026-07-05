---
type: fact
title: "Vale Rules"
---

# Vale Rules

Guide for configuring Vale linter to enforce writing standards in CI pipelines.

## What is Vale?

Vale is a syntax-aware linter for prose. It applies writing rules to documentation files and reports violations like a code linter reports syntax errors. Vale integrates with CI (GitHub Actions, GitLab CI) to enforce style on every PR.

## Configuration (.vale.ini)

```ini
StylesPath = .vale/styles
MinAlertLevel = suggestion

[docs/**/*.md]
BasedOnStyles = Microsoft, ProjectVocab
```

Key settings:
- `StylesPath` -- where custom rule files live
- `MinAlertLevel` -- minimum severity to report: `suggestion`, `warning`, `error`
- Glob patterns define which files get which rules

## Rule Severity Levels

| Level | Meaning | CI behavior |
|-------|---------|-------------|
| `error` | Must fix before merge | Fails CI check |
| `warning` | Should fix, review required | Annotates PR |
| `suggestion` | Consider fixing | Informational only |

## Built-in Style Packages

Install via `vale sync`:

| Package | Focus | Command |
|---------|-------|---------|
| Microsoft | Microsoft Writing Style Guide | `vale sync` after adding to config |
| Google | Google Developer Documentation Style | same |
| write-good | General writing improvement | same |
| alex | Inclusive language | same |
| Readability | Flesch-Kincaid scoring | same |

## Custom Rule Types

### Existence (flag when pattern appears)

```yaml
# .vale/styles/ProjectVocab/Wordiness.yml
extends: existence
message: "Use '%s' instead of wordy phrase."
level: warning
tokens:
  - in order to
  - due to the fact that
  - at this point in time
  - has the ability to
```

### Substitution (suggest replacement)

```yaml
# .vale/styles/ProjectVocab/Terminology.yml
extends: substitution
message: "Use '%s' instead of '%s'."
level: error
swap:
  config: configuration
  repo: repository
  hostname: host name
  e.g.: for example
```

### Occurrence (limit frequency)

```yaml
# .vale/styles/ProjectVocab/SentenceLength.yml
extends: occurrence
message: "Sentences should be under 25 words."
level: suggestion
scope: sentence
max: 25
token: '\w+'
```

### Conditional (enforce consistency)

```yaml
# .vale/styles/ProjectVocab/ConsistentTerms.yml
extends: conditional
message: "Use '%s' consistently, not '%s'."
level: warning
first: frontend
second: front-end|front end
```

### Metric (readability scores)

```yaml
# .vale/styles/Readability/FleschKincaid.yml
extends: metric
message: "Reading level is grade %s (target: 8-12)."
level: suggestion
formula: |
  (0.39 * words / sentences) + (11.8 * syllables / words) - 15.59
condition: "> 12"
```

## Project Vocabulary

### Accept file (terms to allow)

```
# .vale/styles/config/vocabularies/Project/accept.txt
PostgreSQL
Kubernetes
kubectl
gRPC
OAuth2
WebSocket
```

### Reject file (terms to forbid)

```
# .vale/styles/config/vocabularies/Project/reject.txt
simple
easy
just
obviously
clearly
```

## Directory Structure

```
.vale/
  styles/
    config/
      vocabularies/
        Project/
          accept.txt
          reject.txt
    ProjectVocab/
      Wordiness.yml
      Terminology.yml
      BannedWords.yml
      SentenceLength.yml
      Headings.yml
.vale.ini
```

## CI Integration

### GitHub Actions

```yaml
- name: Vale lint
  uses: errata-ai/vale-action@v2
  with:
    files: docs/
    reporter: github-pr-check
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Pre-commit Hook

```yaml
# .pre-commit-config.yaml
- repo: https://github.com/errata-ai/vale
  rev: v3.x.x
  hooks:
    - id: vale
      args: [--config=.vale.ini]
      types: [markdown]
```

## Common Custom Rules

### No "click here" links

```yaml
extends: existence
message: "Use descriptive link text instead of '%s'."
level: error
scope: raw
tokens:
  - 'click here'
  - 'here'
  - 'this link'
```

### Heading case enforcement

```yaml
extends: capitalization
message: "Use sentence case for headings."
level: error
scope: heading
match: $sentence
exceptions:
  - API
  - REST
  - HTTP
  - HTTPS
  - URL
  - SDK
```

### Code block language annotation

```yaml
extends: existence
message: "Code blocks should specify a language."
level: warning
scope: raw
tokens:
  - '```\n'
```

## Testing Rules

```bash
# Test a single rule against a file
vale --config=.vale.ini --output=line docs/sample.md

# Show which rules fire on a specific file
vale --config=.vale.ini --output=JSON docs/sample.md | jq

# Only run specific style
vale --config=.vale.ini --filter=ProjectVocab docs/
```

## Rollout Strategy

1. Start with `suggestion` level for all custom rules
2. Run in CI but do not block merges (informational)
3. After 2 weeks: promote stable rules to `warning`
4. After 1 month: promote critical rules to `error` (blocks merge)
5. Review false positives weekly and add exceptions
