# ADR 0001 — Adopt harness engineering as the repo contract

- Status: accepted
- Date: 2026-11-07
- Supersedes: none
- Related: `DECISIONS.md` index, entry 0001, `docs/harness-design.md`

## Context

This repository is a configuration repo, not an application. Its output is the
behavior of an agent system: prompts, skills, tool guidance, memory, and gates.
Reliability therefore depends on the environment around the model, not on prompt
wording. Two published standards describe that environment:

- **Harness engineering**, five subsystems: instructions, state, verification,
  scope, lifecycle.
- **Harness2** (Google Research, arXiv 2610.14224), eight editable components
  around a frozen model: system prompt, guardrails, memory, tool guidance,
  subagents, skills, scripts, plugins.

Both agree on the same completion rule: a task is done when runtime evidence
passes, not when code is written or the agent is confident. Without a written
contract, each session invents its own definition of done, and failures are
discovered by the user rather than by the repo.

The constraint that forces the choice: the model weights are fixed. Harness2
states it directly — the framework keeps model weights fixed and optimizes the
system around them. Nothing in this repo can retrain or fine-tune anything.

## Decision

Adopt both standards as the repo contract, at the same time.

1. Map every repo file to one of the five subsystems, and keep the mapping in
   `docs/harness-design.md`.
2. Treat the eight Harness2 components as the editable surface. A change touches
   one component and names it.
3. Keep the model frozen. No change may assume a different model, a fine-tune, or
   a prompt-only fix for a structural failure.
4. Every gate is a command with an exit code: `make test`, `make check`,
   `make e2e`, `make check-arch`, `make verify-feature F=<id>`.
5. Verification is layered and ordered: L1 static, L2 runtime, L3 end to end. Do
   not proceed to layer N+1 while layer N fails.

The two-level recursion from Harness2 is adopted as an operating model, not as
vendored code:

- **Task-level**: propose a harness edit, probe it on the same task, adopt only
  when it passes checks the baseline fails.
- **Harnessing-level**: persist adopted harnesses and evidence-backed lessons so
  the next task starts from a better baseline.

A lesson enters the harness only after a probe contrast supports it. No contrast,
no adoption.

## Consequences

Positive:

- Completion is testable. "Done" means an exit code, not a claim.
- Failures become rules. Each review finding has a home in
  `.harness/arch-rules.json` with WHAT / WHY / FIX.
- Cross-session continuity lives in files (`PROGRESS.md`, `DECISIONS.md`,
  `feature_list.json`), not in a chat window.
- Prompt changes are attributable, because one component changes per edit.

Negative:

- Every harness edit costs a gate run. Cheap in seconds, but not free.
- The eight-component taxonomy is a second vocabulary next to the five
  subsystems. Both are kept because each answers a different question: the five
  say where a file belongs, the eight say what may be edited.
- The recursion loop needs real model calls to produce evidence. Dry runs prove
  the plumbing, not the gain.
- Adoption is evidence-gated, so an obviously good idea still waits for a probe
  contrast before it enters the baseline.

Neutral:

- The model is frozen. Gains must come from context construction, the tool
  interface, delegation, and the loop. This bounds the ceiling and makes results
  reproducible.

## Reversal condition

Reverse if either holds:

1. The model becomes tunable inside this repo, so a weights change is available
   and cheaper than a harness change.
2. A gate stops paying for itself: it fails intermittently, or it passes changes
   it should reject, for two consecutive waves. At that point replace the gate
   before adding another.

Neither condition is expected. The gates are cheap and reversible, so the default
is to keep them.
