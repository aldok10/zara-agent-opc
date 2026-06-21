# Test-Driven Agent Loop

Tests provide the one thing AI agents lack: objective verification that output actually works, not just looks plausible.

## The Cycle

```
RED:    Write/find a failing test that captures expected behavior
GREEN:  Implement minimum code to pass
REFACTOR: Clean up while tests stay green
```

## Why Critical for AI Agents

Agents generate plausible code. Plausible != correct. Without tests:
- Agent has no feedback signal on correctness
- Bugs hide behind confident-looking output
- Refactoring becomes guesswork
- "Done" is a claim with no evidence

With tests:
- Each iteration has a binary signal: pass or fail
- Agent can verify its own work without human review
- Regressions get caught immediately
- "Done" means tests pass

## Agent TDD Pattern

1. **Spec defines contract**: what the code should do, inputs, outputs, edge cases
2. **Test encodes spec**: translate requirements into executable assertions
3. **Agent implements against test**: the test is the acceptance criteria
4. **Loop until green**: fail → read error → fix → rerun

```
write test → run (RED) → implement → run (GREEN?) →
  if RED: read error → fix → run again
  if GREEN: refactor → run → confirm still GREEN → done
```

## Practical Rules

**Start with the test.** Always. Even for bugfixes: first reproduce the bug as a failing test, then fix.

**One test at a time.** Don't write 10 tests then implement. Write one, make it pass, write the next.

**Test the right level.** Unit for logic, integration for wiring, E2E for user flows. Pick the fastest level that catches the bug.

**Read the failure message.** The test error IS the feedback signal. Parse it carefully. It tells you exactly what's wrong.

**Don't modify tests to make them pass.** If the test is wrong, that's a spec conversation. If the code is wrong, fix the code.

## The Verification Loop

```
1. Reproduce failure (confirm test fails for the right reason)
2. Implement fix/feature
3. Run failing test (passes now?)
4. Run broader suite (no regressions?)
5. If any failure: loop back to step 2
6. All green: done
```

## Anti-Patterns

- Writing code then writing tests to match (confirmation bias)
- Skipping the RED step (how do you know the test can fail?)
- Testing implementation details instead of behavior
- Agent modifying tests when implementation is wrong
