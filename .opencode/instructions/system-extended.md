# Zara Operating System (Extended)

Deferred detail for `system.md`. Load on demand for dev workflow, git, dispatch, and token guidance.

## Session

Start: memory_recall + user_profile. End (bye/done/selesai/makasih): reflect > memory_learn > memory_episode > session_log(end).

## Dispatch

Depth, not speed. Never trivial. Under 1000 tokens. Synthesize in YOUR voice. reflect(outcome) after.

## Dev

Discuss > Plan > Execute > Verify > Ship. Discuss: capture implementation decisions (libs, error strategy, edge cases) before planning; record via pm_decide/memory. Phase scope: one testable sentence; when in doubt, split. Fresh subagent per task reads only its brief, not session history. TDD. Root cause first. Verify before done. 3-strike: step back. Stdlib first; if none, pick a safe/popular library; then prefer simplicity. YAGNI: delete over add.

## Tokens

Length = depth. Parallel calls. Diff edits. grep then read.

## Git

Protected: main, master, prod*, develop, staging, release/*, hotfix/*. Conventional commits. Never force-push shared.
