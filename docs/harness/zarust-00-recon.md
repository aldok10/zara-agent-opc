# zarust-memory Phase 0 Recon

**Date:** 2026-11-07  
**Scope:** Read-only assessment for Harness² integration  
**Status:** Build blocked; analysis from source code

## 1. Crate Map

| Crate | Purpose | LOC (src) | Key Files |
|---|---|---|---|
| zmem-core | Schema, SQL, storage, auth | ~2,000 | repo/mod.rs (463), auth.rs (405), store/mod.rs (419) |
| zmem-memory | Learning loop, scoring, patterns | ~3,500 | formulas.rs (489), episodes.rs (278), extraction/*.rs (~560) |
| zmem-code | Code index, tree-sitter integration | ~1,400 | index.rs (377), walk.rs (284), query/search.rs (374) |
| zmem-mcp | MCP server, 9 tools, dispatch | ~4,200 | memory.rs (1086), episode.rs (749), session/*.rs (~650) |
| zmem-api | REST wrapper, dashboard, adapters | ~1,200 | adapters.rs (222), config.rs (228), server/mod.rs (167) |
| **Total** | **Workspace** | **~12,300** | 91 .rs files + tests |

## 2. Tool Surface (Current)

**9 tools, 1 action-dispatch per domain:**

1. **memory** — recall, learn, procedure, delete, consolidate, contradictions
2. **episode** — record, start, complete, list, search, feedback
3. **reflect** — record, suggest, patterns, status, blindspot_log, blindspot_check
4. **session** — log, goal, loop, shutdown, profile (each with `mode` sub-action)
5. **knowledge** — index, search
6. **ctx** — execute, batch
7. **dashboard** — (uses `section` param; no action enum)
8. **code_index** — (additive; no action)
9. **code_search** — (additive; no action)

Schema: flat JSON, `action` enum, required fields only, defaults for optional.

## 3. Memory Layer Architecture

**3 Layers + Reflection:**

| Layer | Holds | Learn Via | Decay | Retrieval |
|---|---|---|---|---|
| Semantic | Typed facts (key/value) | Trust calibration | 90-day half-life | BM25 + cosine RRF (K=60) |
| Episodic | Events + outcomes + tags | Reward scoring | Archive stale | FTS5 trigram + recency |
| Procedural | Named step lists | Usage counting | (none) | Ordered steps |
| Reflection | Free text + patterns | Success-weighted ranking | (none) | Pattern matching |

**Learning loop:** recall → (recalledKeys buffer) → reflect record (outcome) → trust delta / reward score → next recall

**Scoring:** reward ∈ {1.0, 0.5, 0.0}, successRate = rewardSum / occurrences, score = successRate × log₂(occurrences + 1)

## 4. Storage & Safety

- **Engine:** SQLite + FTS5, WAL mode, foreign_keys=ON, synchronous=NORMAL
- **Path:** `~/.zara/memory.db`
- **Constitution gates:** policy/architecture/decision/pitfall require `source=user_explicit`, external_unverified only as fact, secrets scan on write, deletion audit-logged
- **Concurrency:** Single-process RO, WAL handles concurrent reads
- **Rate limit:** 120 calls/min enforced in session lifecycle

## 5. Gaps vs Harness² Goals

| Goal | Current | Gap |
|---|---|---|
| **Harness artifacts** | Episodes, patterns | No artifact versioning, no component/path/hash tracking |
| **Improvement harness** | Lessons via patterns | No evidence refs, no adoption state (adopted/proposed/retired) |
| **Run records** | None | No run:id scope, no probe isolation, no results resumption |
| **Briefing** | No | No session start briefing, no `.harness/` pointer querying |
| **Verify/drift** | Partial (contradictions only) | No file content hash, no path+hash verification |
| **Session lifecycle** | Session tool exists | No deterministic handoff note, no consolidation on end |

## 6. Known Issues & Risks

- **Build blocker:** Edition 2024 not stabilized (Cargo 1.80-nightly); needs `cargo-features = ["edition2024"]` or downgrade to 2021
- **No isolation:** Probe data mixed with persistent memory; no `run:<id>` scope for temporary results
- **No idempotency:** Writes lack `key` for resumable probes
- **Secrets:** Constitution gate exists but no active scan for API keys, tokens, passwords
- **Concurrency:** Single-writer assumption; parallel probes would corrupt store

## 7. Integration Status

- **Loaded as:** Host key `Orchestrator` (preserved from Node era)
- **OpenCode:** `mcp.servers.Orchestrator` in opencode.json (V2 format)
- **Binary:** `.exe` built to `target/release/zmem-mcp.exe`
- **Protocol:** JSON-RPC 2.0 over stdio

## 8. Parity vs Node Server

| Feature | Node | Rust | Status |
|---|---|---|---|
| 3 layers | ✓ | ✓ | Parity |
| 7 types | ✓ | ✓ | Parity |
| BM25 + vector RRF | ✗ (BM25 only) | ✓ | Improved |
| FTS5 | ✓ | ✓ | Parity |
| 90-day decay | ✓ | ✓ | Parity |
| Contradictions | ✓ | ✓ | Parity |
| Constitution gates | ✓ | ✓ | Parity |
| Deletion audit | ✓ | ✓ | Parity |
| Code index | ✗ | ✓ | New in Rust |
| Session lifecycle | Partial | Partial | Both incomplete |

## 9. Recommendations

1. **Immediate:** Update Cargo or declare edition 2021 to unblock build
2. **Phase 1 Design:** Map harness² concepts (lessons → adopted facts, runs → episode chains, artifacts → memory records with path+hash)
3. **Phase 2+:** Add scope `run:<id>`, evidence refs, adoption gates, file verification, probe isolation
4. **Concurrency:** Introduce WAL write locks or connection pooling for parallel probes
