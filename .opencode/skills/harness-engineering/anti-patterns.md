# Harness Anti-Patterns

Ten failure modes seen in agent repos. Each one names the gate that catches it.
If a gate cannot catch it, the gate is missing, not the rule.

## 1. Claiming done without a command

- **Symptom:** "Implemented" with no terminal output. The diff exists, the gate never ran.
- **Why:** the model confuses code written with behavior verified. Fluency reads as proof.
- **Gate:** `make verify-feature F=<id>` — a feature only flips to `passing` when its layer commands exit 0, and it writes the evidence line itself.

## 2. Hand-editing feature state

- **Symptom:** `feature_list.json` shows `passing` with an empty or invented `evidence` array.
- **Why:** the gate is slower than an edit, and the session is out of budget.
- **Gate:** re-run `make verify-feature F=<id>`; a hand-set flag has no evidence line, and `git diff feature_list.json` shows a status change with no matching gate run.

## 3. Stacking work on a red baseline

- **Symptom:** a second feature starts while `make check` fails, or while one feature is already `active`.
- **Why:** the failing gate is boring; the new feature is interesting.
- **Gate:** `uv run --project scripts zara-cli init` runs `set -euo pipefail` and stops at the first red layer; `make vcr` fails on two `active` features.

## 4. Prompt-only fixes for environment problems

- **Symptom:** a missing binary, broken config reference, or flaky gate is answered with a paragraph in an agent prompt.
- **Why:** editing markdown is cheap and feels like progress.
- **Gate:** `make test` and `make check` — a prompt edit cannot make a missing file resolve or an MCP binary report healthy.

## 5. Stale docs

- **Symptom:** `AGENTS.md` or `docs/` describe commands that no longer exist, or skip a new gate.
- **Why:** the code change felt finished before the doc did.
- **Gate:** `make test` (config references and agent load) plus the same-commit rule; review `git status --porcelain docs/ AGENTS.md` against `git diff --stat`.

## 6. Skipped layer ordering

- **Symptom:** `make e2e` runs on a red L1, or `make check` is skipped because e2e passed.
- **Why:** the expensive gate looks like the real one; cheap gates get treated as optional.
- **Gate:** `make verify-feature F=<id>` runs the feature's layers in declared order and stops at the first failure.

## 7. Unbounded subagent context

- **Symptom:** a subagent prompt carries a full trace, entire files, or chat history.
- **Why:** the parent wants the child to "have everything" and skips the budget.
- **Gate:** none automatic; the observable fact is prompt size. Keep task, paths, acceptance, return format under 1000 tokens, and require summaries and diffs back.

## 8. Mixing refactor with feature

- **Symptom:** one diff renames modules, reformats, and adds the feature.
- **Why:** the refactor was noticed mid-task and folded in.
- **Gate:** `git diff --stat` touches one component; `make check` cannot attribute a failure to either change.

## 9. Deleting a feature to raise VCR

- **Symptom:** a hard feature disappears from `feature_list.json`; `make vcr` improves.
- **Why:** the ratio is easier to move than the feature is to finish.
- **Gate:** `make vcr` reports passing over activated only; removal shows as a deleted block in `git diff feature_list.json` and must be justified in `DECISIONS.md`.

## 10. Faking a lockfile

- **Symptom:** a hand-written lockfile, a pinned version nobody resolved, or a submodule pointer bumped without a checkout.
- **Why:** reproducibility is asserted instead of produced.
- **Gate:** `make check` — the MCP health check and `git submodule status` rule (ARCH-010) fail on an uninitialized or unpinned tree; `uv run --project scripts zara-cli config validate` fails on an unresolvable reference.
