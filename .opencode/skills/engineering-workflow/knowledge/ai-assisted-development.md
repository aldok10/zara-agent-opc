---
type: fact
title: "AI-Assisted Development - Agentic Coding, Verification, Multi-Agent"
---

# AI-Assisted Development

## Agentic Coding Patterns

### Plan-Code-Verify Loop

```
1. PLAN: Read existing code, understand constraints, state approach
2. CODE: Generate minimal change following project conventions
3. VERIFY: Run tests, typecheck, lint. Actual output required.
4. ITERATE: If verify fails, diagnose root cause, return to plan
```

Never skip verification. Tests passing is proof; "compiles" is not.

### Where agents excel

- Well-defined interfaces (clear input/output contracts)
- Pattern-following tasks (new endpoint matching existing ones)
- Strong type systems constraining outputs
- Existing test suites catching regressions

### Where agents struggle

- Unclear requirements, novel architecture decisions
- Cross-cutting changes touching many files
- Performance work (needs profiling data, not intuition)
- Legacy code with undocumented invariants

## AI Pair Programming Tools

| Tool | Strength | Model |
|------|----------|-------|
| Cursor | Iterative editing, Composer for multi-file | Tab + chat |
| Copilot | Boilerplate, test gen, inline completion | Context from open files |
| opencode | Multi-agent, full shell access, MCP | Terminal-based agentic |
| Windsurf | Large refactors, deep repo indexing | Cascade multi-file |

Key differentiator: tools with shell access (opencode, Cursor agent mode) can verify their own output. Pure completion tools can't.

## Multi-Agent Orchestration

### Dispatcher Pattern

```
User Request → [Dispatcher] → [Specialist] → [Quality Gate] → Result
                                    ↑                 |
                                    └── retry ────────┘
```

### Context Engineering

```
# Good dispatch (focused, testable)
Task: Add pagination to GET /users
Context: src/routes/users.ts:45-80, Prisma ORM
Acceptance: Tests pass, supports page/pageSize params
Return: Changed files + test output

# Bad dispatch (vague, unbounded)
Task: Improve the API
Context: It's a REST API
```

Principles:
- <1000 tokens context per dispatch
- File paths, not file contents (agent reads them)
- Testable acceptance criteria
- Specify return format

### Quality Gates

```python
def quality_gate(output):
    return all([
        tests_pass(output.changed_files),
        lint_clean(output.changed_files),
        no_regressions(output.test_output),
        matches_criteria(output, task.acceptance),
    ])
```

## Verification-First Development

Write tests BEFORE AI writes implementation:

```python
# Step 1: Human writes test (defines behavior)
def test_pagination():
    response = client.get("/users?page=2&pageSize=10")
    assert response.status_code == 200
    assert len(response.json()["data"]) <= 10
    assert response.json()["meta"]["page"] == 2

# Step 2: AI implements to make test pass
# Step 3: Human reviews implementation
```

Inverts the flow: define correctness first, let AI find a path to it. Review effort shifts from "is this correct?" to "does this match intent?"

## AI Code Review

**AI catches well**: style violations, missing error handling, common security issues (injection, XSS), dead code, type mismatches.

**AI misses**: business logic errors, performance in context, architectural violations, subtle race conditions, authz logic bugs.

```
# Effective review prompt
Review for: security (auth bypass, injection), error handling gaps,
contract violations (response vs API spec).
Do NOT comment on: style, naming, formatting (linter handles those).
```

## Prompt Engineering for Code Generation

### Structure that works

```
Context: [language, framework, existing patterns]
Task: [specific, bounded change]
Constraints: [what NOT to do, deps to avoid]
Example: [similar code in project]
Output: [diff, full file, function only]
```

### Anti-patterns

- "Write me a web app" (too broad)
- "Fix this" without error or reproduction
- 5000 lines of context hoping AI finds what matters
- Asking for architecture decisions (AI follows, humans decide)

## SWE-bench and What It Means

Tests AI on real GitHub issues (Python repos). Fix bug given issue + full repo, evaluated by test suite.

**Top scores**: ~50% on SWE-bench Verified (curated subset).

**What it shows**: AI can fix well-specified bugs in well-tested codebases. Localization (finding relevant code) is the key capability. Test-guided search works.

**What it doesn't show**: feature work quality, multi-file architectural changes, whether fix is maintainable.

## DSPy for Prompt Optimization

```python
import dspy

class CodeReviewer(dspy.Module):
    def __init__(self):
        self.reviewer = dspy.ChainOfThought("code, context -> issues, suggestions")
    def forward(self, code, context):
        return self.reviewer(code=code, context=context)

# Compile with examples -- optimizes prompts automatically
optimizer = dspy.BootstrapFewShot(metric=review_quality_metric)
optimized = optimizer.compile(CodeReviewer(), trainset=examples)
```

Use when: measurable metric exists, 20+ labeled examples, same pattern called repeatedly, manual prompt engineering plateaued.

## When to Trust AI Output

### Trust (skip manual review)

- Formatting/style (linter validates)
- Test generation (run tests, check coverage)
- Boilerplate matching existing patterns

### Always verify

- Security-adjacent code (auth, crypto, validation)
- Data migrations, business logic
- Performance-critical paths (benchmark it)
- Infrastructure changes (plan before apply)

### Verification hierarchy

```
Type system → Unit tests → Integration tests → Human review → Production canary
(automated)                                     (manual)       (monitored)
```

## Human-in-the-Loop Patterns

### Escalation triggers (AI should stop and ask)

- Ambiguous requirements (two valid interpretations)
- Shared system changes (DB schema, public API)
- Risk of data loss or irreversible state change
- Two attempts failed (stuck, needs different approach)

### Collaborative pattern

```
Human: "Add caching to user service"
AI: "Three strategies fit. Tradeoffs: [A] vs [B] vs [C]"
Human: "Redis, 5min TTL"
AI: [implements, tests, returns evidence]
```

Human provides decisions. AI provides implementation.

## Measuring AI Productivity

### Metrics that matter

- **Cycle time**: PR open → merged
- **First-pass success**: PRs merged without revision
- **Rework rate**: commits reverting AI-generated code
- **Test coverage delta**: trend over time

### Metrics that mislead

- Lines generated (more isn't better)
- Acceptance rate (accepting bad code is worse)
- PRs/day (volume without quality = debt)

The real measure: shipping correct code faster with fewer production bugs.
