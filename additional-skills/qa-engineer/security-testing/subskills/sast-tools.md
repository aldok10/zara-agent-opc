# SAST Tools

## Semgrep

### Custom Rule Authoring

```yaml
rules:
  - id: sql-injection-string-concat
    patterns:
      - pattern: |
          $QUERY = "..." + $INPUT + "..."
      - pattern-not: |
          $QUERY = "..." + sanitize($INPUT) + "..."
    message: "SQL injection via string concatenation"
    severity: ERROR
    languages: [python, java, javascript]
    metadata:
      cwe: ["CWE-89"]
      owasp: ["A03:2021"]
```

### Taint Tracking

```yaml
rules:
  - id: tainted-sql-query
    mode: taint
    pattern-sources:
      - pattern: request.get($PARAM)
    pattern-sinks:
      - pattern: db.execute($QUERY, ...)
    pattern-sanitizers:
      - pattern: sanitize_input(...)
    message: "User input flows to SQL query unsanitized"
    severity: ERROR
    languages: [python]
```

### Metavariables

- `$X` matches any expression
- `$...ARGS` matches zero or more arguments
- `$_` matches but discards (no binding)
- Metavariable comparisons: `metavariable-comparison: $LEN > 1024`

## CodeQL

### Query Basics

```ql
import javascript

from CallExpr call, StringLiteral arg
where
  call.getCalleeName() = "eval" and
  arg = call.getArgument(0) and
  arg.getValue().regexpMatch(".*\\$\\{.*")
select call, "Eval with template literal input"
```

### Dataflow Analysis

- Source: user-controlled inputs (HTTP params, env vars, file reads)
- Sink: dangerous operations (exec, eval, SQL, file writes)
- Barriers: sanitization functions that break taint propagation
- Variant analysis: find all instances of a known vulnerability pattern

## Semgrep Pro (Cross-File)

- Cross-file analysis: tracks taint across function boundaries and imports
- Cross-function: follows data through call chains without manual pattern chaining
- Requires `--pro` flag or Semgrep Cloud Platform
- Significantly reduces false negatives for multi-file taint flows

## Rule Management

### Registries and Rulesets

```bash
# Use curated registry
semgrep --config=p/owasp-top-ten
semgrep --config=p/ci

# Custom ruleset file
semgrep --config=.semgrep/custom-rules.yml

# Multiple configs
semgrep --config=p/security-audit --config=.semgrep/
```

### Severity Tuning

- Override severity in local rules to match org risk tolerance
- Map: `ERROR` = block merge, `WARNING` = reviewer attention, `INFO` = tech debt

## CI Integration

```yaml
# GitHub Actions
- name: Semgrep SAST
  run: |
    semgrep scan --config=p/ci --config=.semgrep/ \
      --error --severity=ERROR \
      --sarif --output=semgrep.sarif
    # Fails pipeline on ERROR findings only
```

Gate policy: `--error` + `--severity=ERROR` blocks on critical issues only. WARNINGs surface in PR comments without blocking.

## False Positive Management

### Inline Suppression

```python
# nosemgrep: sql-injection-string-concat
query = "SELECT * FROM " + table_name  # table_name is hardcoded enum
```

### Allowlists

```yaml
# .semgrep/settings.yml
exclude:
  paths:
    - tests/fixtures/
    - vendor/
  rules:
    - generic.secrets.security.detected-generic-api-key  # test fixtures only
```

Document every suppression: require comment explaining WHY it's safe.

## Triage Workflow

1. **New finding**: auto-assigned to code owner via CODEOWNERS
2. **Classify**: true positive (fix) | false positive (suppress + document) | won't fix (accept risk)
3. **SLA by severity**: ERROR = 48h, WARNING = 1 sprint, INFO = backlog
4. **Track**: link finding to issue tracker, measure mean-time-to-remediate
5. **Retro**: recurring FPs trigger rule refinement or custom sanitizer registration
