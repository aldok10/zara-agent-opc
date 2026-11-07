# Memory Contract

The memory server is a dependency with a fixed surface. Agents call it; they do
not reimplement it.

## Server

| Field | Value |
|---|---|
| Host key | `Orchestrator` (unchanged from the legacy Node server) |
| Type | local MCP, stdio |
| Binary | `./mcp/zarust-memory/target/release/zmem-mcp.exe` |
| Source | `mcp/zarust-memory` — git submodule of `https://github.com/aldok10/zarust-memory.git` |
| Pin | gitlink commit `e640886c7ba749aaee92eb526066f0f8526eb818` |
| Timeout | 30000 ms |
| Self-check | `./mcp/zarust-memory/target/release/zmem-mcp.exe --check` |

Verified `--check` output on this machine:

```
zara-mcp 0.1.0
tools:  memory, episode, reflect, session, knowledge, ctx, dashboard, code_index, code_search
fts5:   true
```

The host key is preserved so that prompt text and the global override file do
not change. Only the implementation behind the key changed.

## Tool surface

Nine tools. Each takes an `action` enum unless noted.

| Tool | Actions | Purpose |
|---|---|---|
| `memory` | `recall`, `learn`, `procedure`, `delete`, `consolidate`, `contradictions` | Search, store facts, save procedures, guarded delete, dreamer consolidation, contradiction scan |
| `episode` | `record`, `start`, `complete`, `list`, `search`, `feedback` | Episodic layer: one-shot record or start/complete lifecycle with helpfulness feedback |
| `reflect` | `record`, `suggest`, `patterns`, `status`, `blindspot_log`, `blindspot_check` | Learning loop: reflections with outcomes, ranked advice, pattern list, blindspot tracking |
| `session` | `log`, `goal`, `loop`, `shutdown`, `profile` | Each action takes a `mode` sub-action |
| `knowledge` | `index`, `search` | Project knowledge base over `knowledge/` markdown |
| `ctx` | `execute`, `batch` | Shell command execution with timeout and output caps |
| `dashboard` | `section`: `all`, `memory`, `metrics`, `patterns`, `procedures`, `tools`, `rules`, `audit` | Read-only state view; `audit` is explicit-only |
| `code_index` | none (additive) | Walk and index code symbols with tree-sitter |
| `code_search` | none (additive) | Query indexed symbols; requires a prior `code_index` |

`session` modes: `log` start/end/check, `goal` set/check/done/status/clear,
`loop` start/stop/list/clear/check, `shutdown` configure/check/trigger/status/snooze,
`profile` get/discover.

`memory(recall)` layers: `all`, `episodic`, `semantic`, `procedural`.

## Removed actions

The legacy Node surface is gone. These calls fail:

| Removed | Replacement |
|---|---|
| `Orchestrator_memory(action:"episode", ...)` | `Orchestrator_episode(action:"record", ...)` |
| `Orchestrator_memory(action:"episode", op:"reflect", ...)` | `Orchestrator_reflect(action:"record", ...)` |
| `Orchestrator_memory(action:"recall", layer:"knowledge", ...)` | `Orchestrator_knowledge(action:"search", ...)` |
| `Orchestrator_memory(action:"session", ...)` | `Orchestrator_session(action:"log", mode:"start"\|"end"\|"check")` |
| `Orchestrator_memory(action:"system", op:"audit")` | `Orchestrator_dashboard(section:"audit")` |
| `Orchestrator_memory(action:"system", op:"dashboard")` | `Orchestrator_dashboard(section:"all")` |

There is no `knowledge` layer on `memory(recall)`. Knowledge is its own tool.
ARCH-001 and ARCH-002 in `.harness/arch-rules.json` fail the build if a prompt
reintroduces either removed form.

## Storage

| Item | Value |
|---|---|
| Database | `~/.zara/memory.db` |
| Engine | SQLite, WAL mode, `foreign_keys=ON`, `synchronous=NORMAL` |
| Index | FTS5 external-content indexes with triggers |
| Compatibility | Same database file the Node server used; history is preserved |
| Delete audit | `~/.zara/memory-deletes.jsonl`, one line per real delete |
| JSON artifacts | `~/.zara/*.json`, mode `0600`, directories `0700` |

On this machine `~/.zara` is a symlink to `E:\Apps\personal\.zara`. That is a
local layout choice, not part of the contract.

## Write rules

| Rule | Detail |
|---|---|
| Size | One atomic fact per write, 30-50 tokens |
| Dedup | Search before writing; update the existing key instead of adding a near-duplicate |
| Priority | policy > architecture > preference > decision > pitfall > fact |
| Source | Required: `user_explicit`, `observed`, `inferred`, `external_unverified` |
| Provenance | Pass `agent` so the writer is attributable |
| Trust | `success` without a `worked` field degrades to `partial` and applies zero delta |

Do not store secrets, tokens, or full file contents in memory. See
[guardrails.md](guardrails.md).

## Read rules

1. One `memory(recall)` at session start: user profile plus recent session.
2. Complex topics: extract entities, recall each, map relationships, then answer
   with KNOWN / ASSUMED / UNKNOWN separated.
3. Never trust a single search pass. Exact query, then keywords, then a
   rephrased equivalent.
4. A recall miss is not evidence of absence. "Not found" does not mean
   "does not exist".

## Retention

| Mechanism | Behaviour |
|---|---|
| Decay marker | `~/.zara/.last-decay` mtime; startup decay runs when older than 7 days |
| Consolidation | `memory(action:"consolidate")` merges near-duplicates; also reachable as a startup job |
| Contradictions | `memory(action:"contradictions", threshold:0.85)` lists candidate conflicts; threshold is 0-1 |
| Deletion | `memory(action:"delete", pattern:"...", dry_run:true)` first; real deletes append to `memory-deletes.jsonl` |
| Pattern decay | Effectiveness floor 0.3, pass interval 7 days; patterns below the floor are pruned |

Unverified: whether the startup decay gate fires on every process start or only
on the first tool call of a process. The submodule documents it as a startup job
gated by the marker mtime; the exact trigger point was not traced in code.

## Failure modes

| Symptom | Cause | Check | Fix |
|---|---|---|---|
| Tool missing from the session | binary absent | `ls mcp/zarust-memory/target/release/zmem-mcp.exe` | `cd mcp/zarust-memory && cargo +stable-x86_64-pc-windows-gnu build --release -p zmem-mcp` |
| Directory empty | submodule not initialized | `git submodule status -- mcp/zarust-memory` (leading `-` means uninitialized) | `git submodule update --init --recursive` |
| `database is locked` | second writer, or a stale WAL/SHM pair | `ls -la ~/.zara/memory.db*` then `zmem-mcp.exe --check` | Close the other process; the server retries WAL readers. Do not delete `-wal`/`-shm` while a process is live |
| Tools answer but recall is wrong | schema drift or a partial migration | `zmem-mcp.exe --check` and `Orchestrator_dashboard(section:"audit")` | Stop writes, back up `memory.db`, restore from backup. Do not hand-edit the schema |
| `fts5: false` in `--check` | SQLite built without FTS5 | `zmem-mcp.exe --check` | Rebuild with the bundled SQLite feature set |

`--check` verifies the binary loads, the tool registry is complete, and FTS5 is
available. It does not print a schema version; whether it detects schema drift
is unverified. A drift check is therefore a dashboard `audit` plus a backup, not
a single command.
