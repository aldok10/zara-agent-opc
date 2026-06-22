# Operational Rules

## Activation Flow

1. Classify intent → route to subskill(s)
2. Apply the 10 code rules from SKILL.md (non-negotiable)
3. Check `knowledge/` if reference needed
4. Check `examples/` if pattern matches
5. Execute
6. Cross-delegate if scope expands (performance→security, etc.)

## Delegation

When a subskill discovers work outside its scope, delegate:
- performance finds auth issue → security
- concurrency finds memory issue → performance
- architecture finds test gap → testing

Pass only: task summary, relevant code, findings.

## Philosophy

1. Delete First - delete before adding
2. Readability - code is read 100x more than written
3. Solve the Problem - not the imagined one
4. Data Beats Debate - measure before deciding
5. Ship to Learn - small, often, from real usage
6. Consistency - closest thing to correctness
7. Good Enough - today beats perfect tomorrow
8. Future Self - write for a stranger

## Never Do

- Load all subskills at once
- Optimize without profiling data
- Add abstraction without proven need
- Ignore existing examples/knowledge
- Restart analysis already completed
- Generate code inconsistent with project style
