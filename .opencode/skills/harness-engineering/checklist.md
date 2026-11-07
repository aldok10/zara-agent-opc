# Harness Checklist

Every item is a command or an observable fact. "Looks fine" is not an item.

## Pre-Flight

1. `pwd` prints `E:/Apps/personal/zara-agent-opc`.
2. `git status --porcelain` prints nothing, or the uncommitted paths are named in `PROGRESS.md`.
3. `uv run --project scripts zara-cli init` exits 0.
4. `make test` exits 0.
5. `make check` exits 0.
6. `PROGRESS.md` has `## Current State`, `## Next Steps`, `## Blockers`.
7. `make vcr` exits 0 (WIP=1 holds, no unannotated `blocked` feature).
8. The target feature id exists in `feature_list.json` and its `state` is `active` or `planned`.
9. `templates/sprint-contract.md` is filled for the feature: scope, DoD, exclusions.
10. `git log --oneline -5` shows the last commit matches the state described in `PROGRESS.md`.

## In-Flight

11. Only one feature is `active`: `uv run --project scripts zara-cli vcr` and read the output.
12. `git diff --stat` touches one component, not several.
13. `make test` exits 0 after every edit.
14. `make check-arch` exits 0 after any edit to `.opencode/**` or `opencode.json`.
15. `uv run --project scripts zara-cli config validate` reports `0 problems`.
16. `make verify-feature F=<id>` was run; the output ends in `-> passing; evidence recorded`.
17. `python -c "import json;print([f['evidence'] for f in json.load(open('feature_list.json'))['features'] if f['id']=='<id>'])"` prints at least one evidence line.
18. `make e2e` was run if the diff touches `.opencode/agent/`, `.opencode/skills/`, or the MCP surface.
19. No status field was edited by hand: `git diff feature_list.json` shows only evidence and `last_updated` changes.
20. Docs touched by the change are edited in the same working tree: `git status --porcelain docs/ AGENTS.md`.
21. A subagent prompt stays under 1000 tokens: task, paths, acceptance, return format.
22. Any repeated error category has a rule in `.harness/arch-rules.json` with `what`, `why`, `fix`.

## Clock-Out

23. `make check` exits 0.
24. `make clean-check` exits 0.
25. `make test` exits 0 on a clean tree.
26. `PROGRESS.md` states current state, next step, blockers, and the gate output.
27. `git status --porcelain` shows no debug artifact, temp file, or `.env`.
28. One commit, message explains why, no unrelated files: `git show --stat HEAD`.
29. `uv run --project scripts zara-cli init` exits 0 from the committed state.
30. The next feature is identifiable from `feature_list.json` alone, without chat history.
