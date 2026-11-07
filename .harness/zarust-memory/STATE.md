# zarust-memory: Harness² Integration

## Phase 0 — Recon (READ-ONLY)

**Status:** COMPLETE  
**Date:** 2026-11-07  
**Toolchain:** rustc 1.80.0-nightly, cargo 1.80.0-nightly  
**Blocker:** Edition 2024 requires `cargo-features = ["edition2024"]` (Cargo too old)

### Done
- [x] Located zarust-memory at `mcp/zarust-memory/` (git submodule)
- [x] Crate map: 5 crates, ~12.3K LOC, 91 .rs files
- [x] Tool surface: 9 tools (memory, episode, reflect, session, knowledge, ctx, dashboard, code_index, code_search)
- [x] Memory: 6 actions (recall, learn, procedure, delete, consolidate, contradictions)
- [x] Storage: SQLite + FTS5, semantic/episodic/procedural layers, scoring via trust/reward formulas
- [x] Parity vs Node: BM25+vector RRF (improved), code index (new), session lifecycle (incomplete)
- [x] Gaps identified: No artifact versioning, no evidence refs, no run:id scope, no briefing, no file verification
- [x] Recon doc: `docs/harness/zarust-00-recon.md` (9 sections, parity table, 9 recommendations)
- [x] Baseline: Build blocked by edition 2024; need Cargo update or downgrade to 2021

### Open Questions for Phase 1 Design
1. Edition strategy: update Cargo, or declare 2021?
2. Lesson adoption: evidence refs format (test result, run id, commit SHA)?
3. Proof of improvement: what constitutes evidence for a lesson?
4. Scope isolation: namespace probes as `run:<task>:<timestamp>:<k>` or simpler?
5. Idempotency: require `key` on every write, or per-action?

### Next: Phase 1 Design
- Approve or adjust recon findings
- Design data model (lesson, evidence, artifact, run, scope)
- Tool contract extensions (seed ops: lesson_add, lesson_decide, artifact_put, run_put, promote, verify)
- Briefing algorithm (policy → open items → adopted lessons → procedures; budget 800 tokens)
- Concurrency plan for parallel probes
