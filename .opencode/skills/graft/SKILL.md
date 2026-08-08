---
name: graft
description: "Graft repo context graph: query a prebuilt code graph instead of grepping. Use when the current repo has a graft/ directory and the task needs code discovery - finding where code lives, understanding how a system works, tracing callers, or scoping a refactor's blast radius."
---

# Graft

Precondition: this skill applies only when the repo has a `graft/` directory.
Verify with `graft_check_freshness` or `graft check`. No graph means fall back to
codebase-memory-mcp or grep, and do not build one unless the user asks.

`graft/` holds a graph of the repo: markdown nodes explaining each part in prose
with exact `file:line` spans, plus a wiring graph of who-calls-what. A node costs
a few hundred tokens; rebuilding that understanding by reading source costs
thousands and misses the edges.

Every query is `$0`, needs no API key, and returns in under a second.

## Which tool has bash

- `implementation` (Forge) has `bash: allow` → may use the `graft` CLI.
- Every other subagent has `bash: deny` → **must** use the `graft_*` MCP tools.
  The CLI will simply fail for them.

CLI → MCP mapping:

| CLI | MCP tool |
|-----|----------|
| `graft ask "<q>"` | `graft_find_code` |
| `graft grep "<re>"` | `graft_find_all` |
| `graft skeleton <file>` | `graft_file_api` |
| `graft callers <sym>` | `graft_trace_calls` |
| `graft map` | `graft_repo_map` |
| `graft check` | `graft_check_freshness` |

## Pick one tool, act on the answer

Most tasks need a single call. Do not chain tools hoping for more, and never
re-ask the same question reworded. If one tool is not enough, switch to the tool
that fits the next need.

### Locate + understand → `graft_find_code` / `graft ask "<q>" --source`

Ranked retrieval routed between prose nodes and the wiring graph, returning top
hits with exact `file:line`. `--source` inlines the ≤8-line crux of each
definition, so the result IS the code you need. Add `--full` only when the crux
is too small to act on. `--in <path>` narrows before ranking; `-n N` caps results.

Use for conceptual or locational questions: "how does auth work", "where is
rate-limiting handled", "what assembles the request pipeline".

### Every occurrence → `graft_find_all` / `graft grep "<literal>"`

Exhaustive over indexed files, grouped by enclosing symbol, ranked by coupling.
`ask` is ranked top-N and will miss instances. Use this whenever the task says
every, all, or rename.

### API surface → `graft_file_api` / `graft skeleton <file>`

Every signature plus span in one file, no bodies. ~10× cheaper than reading it.

### Edges → `graft_trace_calls` / `graft callers <sym>`

Precomputed, exact. Default is who calls it; `--direction out` for what it calls;
`--depth N` or `--depth all` for the full blast radius. For structural questions
skip ranking and use this directly.

**Before any refactor, rename, or signature change: run this with `--depth all`
first.** Editing the primary file and stopping is the classic miss (platform
siblings, a file that needs extracting).

**Known limitation — `callers` undercounts method calls.** When the receiver comes
from a function parameter or a struct field (`masker.MaskColumn(...)` where
`masker` is a param, or `r.masker.MaskText(...)`), the edge is often missing.
Verified on a 64-file Go repo: `MaskColumn` reported "no indexed callers" against
8 real call sites; `MaxValueBytes` reported zero against 2. graft flags this
itself ("this may undercount") and tells you to fall back.

So: **`callers` is a lower bound, not the answer.** Treat a zero or suspiciously
small result as unproven, and confirm with `graft grep "<symbol>"`, which IS
exhaustive (verified: 17 hits vs 17 from `grep -rn`). For any rename or signature
change, `grep` is the authority; `callers` only adds the transitive walk.

### Orientation → `graft_repo_map` / `graft map`

Directory clusters, per-dir hubs, global hotspots, token-budgeted. Run first on
an unfamiliar repo. The map alone is the answer; do not then skeleton every
subsystem it names.

## Rules

- If a returned span is truncated ("+N more lines"), open that exact range before
  finalizing. Never re-read whole files.
- Monorepos and multi-repo folders rank fairly across sub-projects; hits carry
  `[scope/]` labels. Narrow with `--in <scope>/`.
- `graft/INDEX.md` lists every node if you would rather browse.
- Queries refresh the graph structurally before answering, so results describe
  the code as it is right now, uncommitted edits included.
- After large code changes: `graft build` (deterministic, no key, `$0`).
- `graft build --deep` calls an LLM under the user's key. **Never run it unasked.**

## Relation to codebase-memory-mcp

Both answer "where does this live" and "who calls this". Pick one per task, never
both. graft is repo-local tree-sitter, regenerable, `$0`. codebase-memory-mcp is
server-side and semantic, better at bridging vocabulary. When a repo has `graft/`,
prefer graft.

## AI-Era Context (2026)

**Code Discovery Evolution**: Traditional grep/find is obsolete for structured code discovery. Graph-based tools (graft, codebase-memory-mcp, Sourcegraph) provide semantic understanding with exact locations. graft's advantage: local-first, instant refresh, zero cost.

**Agent Architecture**: Read-only agents (scout, atlas, lens, etc.) run with `bash: deny`, so they MUST use MCP tools (`graft_*`). Only implementation agents (forge) can use CLI. This separation prevents accidental modifications during discovery.

**Performance**: Graph query (~100ms, $0) vs reading source (~5s, context cost). For large codebases, graph queries save 50-100x tokens and return faster. Especially valuable for AI agents with limited context windows.
