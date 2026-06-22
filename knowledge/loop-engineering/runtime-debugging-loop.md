# Runtime Debugging Loop

For failures that only appear when code runs. The compiler can't catch these. Tests might not cover them. You need to observe actual behavior.

## Pattern

```
Hypothesis → Targeted inspection/change → Observe result → Update hypothesis → Repeat
```

## Rules

**One variable at a time.** Change one thing, observe one result. Multiple changes make it impossible to know what fixed it (or broke it worse).

**Binary search the problem space.** Is it in the request or the response? Client or server? Before or after the middleware? Cut the space in half each iteration.

**Never guess without evidence.** "I think it might be..." is the start of investigation, not the basis for a fix.

**Follow the data.** Trace the actual values through the actual code path. Don't reason about what should happen. Look at what does happen.

## Evidence Sources

| Layer | Sources |
|-------|---------|
| Frontend | Console errors, network tab, screenshots, DOM state |
| API | Request/response bodies, status codes, headers, timing |
| Backend | Logs, stack traces, debugger, profiler |
| Database | Query logs, explain plans, constraint violations |
| Infrastructure | Container logs, resource metrics, DNS, network |

## The Debugging Loop

```
1. Reproduce reliably (if you can't reproduce, you can't verify the fix)
2. Form hypothesis from available evidence
3. Design minimal test of hypothesis (log, breakpoint, targeted change)
4. Execute and observe
5. If confirmed: fix the root cause, not the symptom
6. If disproved: update hypothesis, return to step 2
7. After fix: verify original reproduction case passes
8. Check for related occurrences of same root cause
```

## Frontend-Specific

- Hydration mismatches: compare server HTML vs client render
- Layout issues: computed styles, box model, viewport
- State bugs: component lifecycle, stale closures, race conditions

## Backend-Specific

- Trace the request through middleware stack
- Check error handling paths (are errors swallowed silently?)
- Concurrency: race conditions, deadlocks, resource contention
- External dependencies: timeouts, retries, circuit breaker state

## When to Escalate

- Can't reproduce after 3 attempts: ask for more context
- Hypothesis disproven 3 times: step back, broader investigation
- Root cause is in a dependency: report upstream, workaround locally
