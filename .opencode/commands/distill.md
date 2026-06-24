---
description: Failure pattern extraction - mines reflects for recurring failures, proposes policies/pitfalls for user approval
---

# /distill - Failure Mining

Extract recurring failure patterns from reflects and propose persistent rules.

## When to Use

- Manually: when you want to review accumulated failures
- Suggested: after 5+ failure/partial reflects since last distill
- Suggested: after 10+ sessions without distill

## Steps

1. **Gather failures:**
   ```
   memory_recall(query: "failure partial", layer: "episodic")
   patterns()  — check existing pattern scores
   ```
   Max 3 proposed rules per run. If more clusters qualify, pick top 3 by instance count.
   ```

2. **Cluster by root cause:**
   Categories: dispatch, implementation, verification, hallucination, scope-drift, communication.
   Group by shared root cause, not surface symptoms.

3. **Filter by threshold:**
   Only clusters with 3+ instances qualify. Report sub-threshold as "monitoring."

4. **Verification gates (all must pass):**
   - Cluster quality: entries share actual root cause
   - Contradiction scan: `memory_contradictions()` against proposed rule
   - Specificity: rule is binary-testable (not vague advice)
   - Existing coverage: `memory_recall(query: "<pattern>", type: "pitfall")`

5. **Present to user (HITL gate):**
   Show proposed rules. NEVER auto-persist. Wait for explicit approval.

6. **On approval:**
   ```
   memory_learn(type: "pitfall", key: "<pattern-name>", value: "<rule>", source: "inferred")
   ```

## Output Format

```
## Distill Report

Analyzed: N failure/partial episodes since last distill
Clusters: M qualifying, K monitoring

### [Cluster Name] (X instances)
Root cause: ...
Proposed rule: "..."
Action: NEW | UPGRADE existing | MONITORING

[repeat]

Pending approval: N rules. Say "ok" to persist, or edit individually.
```

## Safety

- Source is always "inferred" (never "user_explicit" for auto-generated rules)
- Security-relevant pitfalls (auth, permissions, secrets) require extra confirmation
- Run `memory_contradictions()` after every successful distill
- All persisted rules are deletable via `memory_delete(pattern: "<key>")`
