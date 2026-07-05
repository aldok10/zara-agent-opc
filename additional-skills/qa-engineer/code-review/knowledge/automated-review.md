---
type: fact
title: "Automated Code Review Tools"
---

# Automated Code Review Tools

## Categories of Automated Review

### Static Analysis (Linters)
Catch code quality issues without running the code.

| Language | Tool | Focus |
|----------|------|-------|
| JavaScript/TS | ESLint | Style, errors, patterns |
| Python | Ruff, Pylint | Style, type errors, complexity |
| Go | golangci-lint | Multi-linter aggregator |
| Java | Checkstyle, SpotBugs | Style, bug patterns |
| All | SonarQube | Multi-language quality gate |

### Type Checking
| Language | Tool |
|----------|------|
| TypeScript | tsc --strict |
| Python | mypy, pyright |
| Flow | flow check |

### Security Scanning (SAST)
| Tool | Focus |
|------|-------|
| Semgrep | Custom rules, OWASP patterns |
| CodeQL | Deep semantic analysis |
| Snyk Code | Vulnerability patterns |
| Bandit (Python) | Security-focused linting |
| gosec (Go) | Go security checker |

### Dependency Scanning
| Tool | Focus |
|------|-------|
| Dependabot | Known CVEs in deps |
| Snyk | Vulnerability database |
| Socket | Supply chain attacks |
| npm audit | Node.js vulnerabilities |

## AI-Assisted Code Review

### Tools Available
| Tool | Approach |
|------|----------|
| GitHub Copilot | PR summaries, review comments |
| CodeRabbit | AI review on every PR |
| Sourcery | Python-focused refactoring suggestions |
| Qodo (CodiumAI) | Test suggestions, review insights |
| Amazon CodeGuru | Performance + security (Java, Python) |

### What AI Review Is Good At
- Spotting common patterns (null checks, resource leaks)
- Summarizing large PRs for human reviewers
- Suggesting test cases for uncovered paths
- Identifying inconsistencies with project patterns
- Detecting potential performance issues

### What AI Review Is Bad At
- Understanding business context and intent
- Evaluating architectural decisions
- Judging if code solves the right problem
- Nuanced security analysis (threat modeling)
- Team dynamics and knowledge sharing

### Integration Pattern
```yaml
# .github/workflows/ai-review.yml
name: AI Review
on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: coderabbitai/ai-pr-reviewer@v1
        with:
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
          review_comment_lgtm: false
          path_filters: |
            !**/*.lock
            !**/generated/**
```

## CI Pipeline Integration

### Quality Gate Example
```yaml
# Multi-tool review pipeline
jobs:
  lint:
    steps:
      - run: npx eslint . --max-warnings 0
      
  type-check:
    steps:
      - run: npx tsc --noEmit
      
  security:
    steps:
      - run: npx semgrep --config auto --error
      
  complexity:
    steps:
      - run: npx complexity-report --threshold 10
      
  test-coverage:
    steps:
      - run: npx jest --coverage --coverageThreshold='{"global":{"branches":80}}'
```

### PR Decoration
Tools that comment directly on PRs:
- **Danger.js**: Custom rules (PR size, missing tests, TODO tracking)
- **Reviewdog**: Run any linter, post results as PR comments
- **SonarCloud**: Quality gate status + inline annotations

### Danger.js Rules Example
```typescript
// dangerfile.ts
import { danger, warn, fail } from 'danger';

// Large PR warning
if (danger.github.pr.additions + danger.github.pr.deletions > 500) {
  warn('PR is over 500 lines. Consider splitting.');
}

// Missing tests
const hasTests = danger.git.modified_files.some(f => f.includes('test'));
const hasSrc = danger.git.modified_files.some(f => f.includes('src'));
if (hasSrc && !hasTests) {
  warn('Source files changed without test changes.');
}

// No PR description
if (!danger.github.pr.body || danger.github.pr.body.length < 20) {
  fail('PR must have a description explaining the change.');
}

// Console.log left in
const jsFiles = danger.git.modified_files.filter(f => f.endsWith('.ts'));
for (const file of jsFiles) {
  const diff = await danger.git.diffForFile(file);
  if (diff?.added.includes('console.log')) {
    warn(`console.log found in ${file}`);
  }
}
```

## Metrics from Automated Review

Track over time:
- Lint error count per PR (trending down?)
- Security findings per sprint
- Average PR review time (human)
- False positive rate of AI suggestions
- Coverage delta per PR

## Recommended Stack (Minimal)

1. **Linter** (language-specific)  -  catches style + common errors
2. **Type checker**  -  catches type errors before runtime
3. **Semgrep**  -  catches security issues with custom rules
4. **Danger.js**  -  enforces PR hygiene (size, description, tests)
5. **Dependabot/Snyk**  -  keeps deps patched

This stack catches ~60-70% of issues before human review, letting reviewers focus on logic, design, and business correctness.
