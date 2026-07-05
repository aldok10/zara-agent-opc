---
type: fact
title: "Documentation Linting"
---

# Documentation Linting

Automated quality checks for technical writing: consistency, style, and correctness.

## Vale

Prose linter with customizable style rules:

### How It Works

- Reads Markdown, AsciiDoc, RST, HTML, and code comments
- Applies style rules from YAML configuration files
- Reports suggestions, warnings, and errors with line/column positions
- Integrates with CI, editors (VS Code, Vim), and pre-commit hooks

### Configuration (.vale.ini)

```ini
StylesPath = .vale/styles
MinAlertLevel = suggestion

[*.md]
BasedOnStyles = Vale, Microsoft, write-good

[*.yaml]
BasedOnStyles = Vale

# Disable specific rules for changelogs
[CHANGELOG.md]
Microsoft.Headings = NO
```

### Built-in Styles

| Style Package | Focus | Example Rules |
|---------------|-------|---------------|
| Vale | Core checks | Spelling, capitalization |
| Microsoft | Microsoft style guide | Active voice, sentence length |
| Google | Google developer docs style | Word choice, abbreviations |
| write-good | General writing quality | Passive voice, weasel words |
| Readability | Grade level scoring | Flesch-Kincaid, Coleman-Liau |

### Custom Rules

```yaml
# .vale/styles/ProjectStyle/Acronyms.yml
extends: existence
message: "Define '%s' on first use."
level: warning
tokens:
  - 'SLO'
  - 'SLA'
  - 'mTLS'
  - 'RBAC'
```

```yaml
# .vale/styles/ProjectStyle/BannedWords.yml
extends: existence
message: "Avoid '%s'. Use a more specific term."
level: error
tokens:
  - 'obviously'
  - 'simply'
  - 'just'
  - 'easy'
```

## markdownlint

Structural and formatting rules for Markdown files:

### Common Rules

| Rule | What It Checks |
|------|---------------|
| MD001 | Heading levels increment by one (no skipping h2 → h4) |
| MD009 | No trailing spaces |
| MD013 | Line length (configurable, often 120 or disabled) |
| MD024 | No duplicate headings |
| MD032 | Lists surrounded by blank lines |
| MD033 | No inline HTML (for pure-Markdown projects) |
| MD041 | First line should be a top-level heading |

### Configuration (.markdownlint.json)

```json
{
  "MD013": { "line_length": 120 },
  "MD033": false,
  "MD024": { "siblings_only": true },
  "MD036": false
}
```

### markdownlint-cli2 (Recommended)

- Supports glob patterns for file targeting
- Config inheritance (per-directory overrides)
- Fix mode: `markdownlint-cli2 --fix "**/*.md"`
- Ignore patterns: `.markdownlintignore` file

## textlint

Pluggable linting framework for natural language:

### Key Difference from Vale

- Plugin-based architecture (npm packages)
- Rules are JavaScript modules  -  more programmable
- Supports fixing (auto-correct) for many rules
- Better for non-English content (i18n support)

### Configuration (.textlintrc.json)

```json
{
  "rules": {
    "no-dead-link": true,
    "terminology": {
      "defaultTerms": false,
      "terms": [
        ["Kubernetes", "kubernetes"],
        ["GitHub", "github|Github"],
        ["PostgreSQL", "Postgres|postgres|POSTGRES"]
      ]
    },
    "sentence-length": {
      "max": 150
    },
    "no-exclamation-question-mark": {
      "allowQuestion": true
    }
  }
}
```

### Useful Plugins

| Plugin | Purpose |
|--------|---------|
| textlint-rule-no-dead-link | Verify URLs are reachable |
| textlint-rule-terminology | Enforce consistent term usage |
| textlint-rule-write-good | English style suggestions |
| textlint-rule-sentence-length | Flag overly long sentences |
| textlint-rule-unexpanded-acronym | Catch undefined acronyms |

## CI Integration

### GitHub Actions Example

```yaml
name: Docs Lint
on:
  pull_request:
    paths: ['docs/**', '*.md']

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Vale
        uses: errata-ai/vale-action@v2
        with:
          files: docs/
          reporter: github-pr-review

      - name: markdownlint
        uses: DavidAnson/markdownlint-cli2-action@v16
        with:
          globs: '**/*.md'
```

### Pre-commit Hook

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/igorshubovych/markdownlint-cli
    rev: v0.39.0
    hooks:
      - id: markdownlint
        args: ['--fix']
  - repo: https://github.com/errata-ai/vale
    rev: v3.0.0
    hooks:
      - id: vale
        args: ['--no-exit']
```

## Custom Rules Development

### When to Write Custom Rules

- Project-specific terminology enforcement (product names, API terms)
- Banned phrases unique to your organization
- Domain-specific writing conventions
- Compliance requirements (legal, accessibility language)

### Vale Custom Rule Types

| Type | Use Case | Example |
|------|----------|---------|
| existence | Flag specific words/phrases | Ban "click here" |
| substitution | Suggest replacement | "utilize" → "use" |
| occurrence | Limit frequency | Max 1 exclamation mark per file |
| consistency | Pick one and stick with it | "grey" vs "gray" |
| conditional | If X exists, Y must also exist | If API mentioned, link required |

## Adoption Strategy

### Phase 1: Non-Breaking (Week 1-2)
- Add markdownlint with permissive config (disable noisy rules)
- Run as informational in CI (don't block merges)
- Fix existing violations in bulk PR

### Phase 2: Enforce Structure (Week 3-4)
- Enable markdownlint as blocking check
- Add Vale with conservative ruleset (errors only, no style suggestions)
- Document which rules apply and why

### Phase 3: Style Enforcement (Month 2+)
- Add project-specific terminology rules
- Enable style suggestions (warnings displayed but not blocking)
- Create custom rules for domain-specific patterns
- Review rule effectiveness quarterly (disable rules with >50% false positive rate)

## Anti-Patterns

- Enabling all rules on day one (overwhelming, team ignores linter)
- Linting without auto-fix options (creates tedious manual work)
- Custom rules without documentation (nobody knows why a rule exists)
- Blocking CI on style suggestions (only block on errors, suggest on style)
- No exception mechanism (sometimes rules legitimately don't apply)
- Linting generated files or third-party content (add to ignore list)
