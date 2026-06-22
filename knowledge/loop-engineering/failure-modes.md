# Loop Failure Modes and Fixes

Every failure mode has a structural fix. Recognize the pattern, apply the fix, don't just retry harder.

## Thrashing

**Symptom**: Code changes back and forth without converging. Each fix breaks something else.

**Root cause**: Actions too large, feedback too noisy, or conflicting constraints.

**Fix**: Narrow scope. Smaller diffs. Find the one reliable signal and optimize for it. If two tests conflict, resolve the contradiction before coding.

## Overfitting to Tests

**Symptom**: Tests pass but the requirement isn't actually met. Agent satisfies the letter, not the spirit.

**Root cause**: Tests don't cover the real requirement. Agent optimizes for the measurable signal.

**Fix**: Combine automated checks with behavioral verification. Add acceptance-level tests that test user-facing behavior, not implementation details.

## Context Drift

**Symptom**: Agent works from assumptions that were true 10 iterations ago but aren't anymore.

**Root cause**: Not refreshing context after significant changes. Reasoning from memory instead of observation.

**Fix**: After every significant action, re-read actual state. Don't trust cached assumptions. "I think file X has..." is a signal to re-read file X.

## Unsafe Autonomy

**Symptom**: Agent takes destructive or irreversible action without verification.

**Root cause**: No permission gates. All actions treated as equal risk.

**Fix**: HITL gates for destructive ops. Risk classification per action. Safe ops proceed, dangerous ops confirm.

## Degeneration of Thought

**Symptom**: Agent's self-review confirms its own errors. "Looks correct to me" when it's wrong.

**Root cause**: Self-assessment uses the same flawed reasoning that produced the error.

**Fix**: External verifier. Compiler, tests, second agent, human. Never trust only self-review.

## Infinite Loops

**Symptom**: Agent retries the same failing approach, sometimes with trivial variations.

**Root cause**: No same-error detection. No retry cap. No escalation path.

**Fix**: Track error fingerprints. If same error 3x, force different approach. Hard iteration cap. Escalate to outer loop or human.

## Gold Plating

**Symptom**: Agent keeps improving code beyond what was asked. Adds error handling, refactors neighbors, writes extra tests.

**Root cause**: No clear stopping rule tied to acceptance criteria.

**Fix**: Define "done" explicitly before starting. When acceptance criteria are met, stop. Additional improvements go in separate tasks.

## Sunk Cost

**Symptom**: Agent continues bad approach because it invested 10 iterations already.

**Root cause**: No kill threshold. Emotional attachment to invested work.

**Fix**: Kill threshold. If approach hasn't shown progress in N iterations, start fresh. Previous iterations are learning, not debt.
