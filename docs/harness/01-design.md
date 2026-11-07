# PHASE 2 Design — Harness² + Learn HE Integration into Zara V2

**Date:** 2026-11-07  
**Status:** Design specification (awaiting approval)  
**Target:** OpenCode V2 only; zero required dependencies beyond current stack (Node 22+, Python 3.12, uv)

---

## 1. Design Principles

1. **Reuse existing structure** — `.harness/` already has tasks, candidates, ledger, decisions. Extend, don't duplicate.
2. **No code copy** — Paraphrase concepts from both references. Attribution in ATTRIBUTION.md.
3. **Token budget** — Injected harness context ≤ 400 tokens/turn (system prompt edits, evidence snippets, reflection notes).
4. **V2-only** — No V1 plugins. Plain `{id, setup(ctx)}` exports if plugin needed; skip if possible.
5. **Deterministic by default** — Dry-run mode (zero model calls) before `--execute`.

---

## 2. Map 8 Harness Components

| Component | Current Zara | Integration |
|-----------|--------------|-------------|
| **System prompt** | `.opencode/agent/*.md` (13 agents) | ✓ Existing; hook into context for candidate overlays |
| **Guardrails** | `opencode.json` permissions + ARCH rules | ✓ Existing; extend with harness guard checks |
| **Memory** | Orchestrator MCP (zmem-mcp) | ✓ Existing; add `Orchestrator_improvement` action for evidence store |
| **Tool guidance** | `.opencode/skills/` + MCP server descriptions | ✓ Existing; no change needed |
| **Subagents** | 14 agents (Hive, Refiner, Forge, etc.) | ✓ Existing; Hive orchestrates PPC probes, Refiner scores contrasts |
| **Skills** | `additional-skills/` + `.opencode/skills/` | ✓ Existing; extend harness-engineering skill with PPC templates |
| **Scripts** | `scripts/zara_cli/` (Python CLI) | ✓ Existing; add `harness` subcommands (ppc, improve, resume) |
| **Plugins** | None (deleted v1; V2 not needed yet) | ◯ Optional; if needed, implement as MCP tool instead |

**Summary:** 7/8 components already present. Plugins deferred (use MCP instead).

---

## 3. Propose–Probe–Compose (PPC) Architecture

### Task-Level Recursion

```
Input: task (goal + checks) + candidate overlay (optional)
         |
         v
    [Propose]  Generate candidate edits (deterministic; no model call)
         |
         +---> dry-run: print plan, exit 0
         |
         +---> execute:
              [Baseline Probe]  Run task with original harness
                   |
                   v
              [Collect Evidence] Score baseline against checks
                   |
                   v
              [Candidate Probe] Run task with candidate overlay
                   |
                   v
              [Collect Evidence] Score candidate against checks
                   |
         v------+
    [Compose]  Compare contrasts, decide adoption
         |
         v
    [Ledger]   Append to ledger.jsonl (ts, task, candidate, baseline_pass, candidate_pass, adopted)
         |
         v
    Output: adopted harness + evidence for next task
```

### Parallel vs. Sequential Recursion

**Parallel (`--k 2 --mode parallel`):**
- Propose K general + K domain-specific candidates (2K total probes)
- Run all probes in parallel via Hive delegation
- Collect evidence from all
- Compose K final candidates from shared evidence
- Cost: 1 (baseline) + K (general) + K (domain) = 2K+1 model calls

**Sequential (`--k 2 --mode sequential`):**
- Propose 1 candidate
- Run baseline + candidate (2 probes)
- Compose 1 refined harness; record evidence
- Feed refined harness + evidence into next iteration
- Repeat K times
- Cost: 1 (baseline) + K × 2 (candidate pairs) = 2K+1 model calls (same total; different distribution)

**Implementation:** Both modes use same PPC engine; differ only in loop structure and evidence accumulation.

---

## 4. Harnessing-Level Recursion (Improvement Harness)

### Purpose
Persist evidence-backed lessons from each task to guide future refinement. Unlike task-level (which refines within one task), this refines across tasks.

### Mechanism

```
Task 1  →  PPC  →  Contrast(1)  →  Evidence(1)  ┐
                                                 ├─→  Improvement Harness  →  Lesson
Task 2  →  PPC  →  Contrast(2)  →  Evidence(2)  ┤    (reflection + learning)
                                                 │
Task 3  →  PPC  →  Contrast(3)  →  Evidence(3)  ┘
       ↑________________|________________↑
                Next task uses lessons
                from all prior tasks
```

### Data Model

**Ledger entry (per probe):**
```json
{
  "ts": "2026-11-07T13:32:35Z",
  "task": "harness-ok",
  "candidate": ".harness/candidates/0001-explicit-verification.md",
  "baseline_pass": ["zara-ok"],
  "candidate_pass": ["zara-ok"],
  "adopted": true,
  "duration_s": 42.5,
  "evidence": {
    "what_changed": "Added explicit verification step to prompt",
    "why_it_worked": "Reduced hallucination in structured output",
    "when_apply": ["code-generation", "verification-heavy"]
  }
}
```

**Improvement harness (persisted in memory or `.harness/improvement/`):**
```
[
  {
    "lesson": "Explicit verification reduces hallucination",
    "confidence": 0.8,
    "adopted_from": ["task-1", "task-3"],
    "applicable_to": ["code-generation", "verification"],
    "reflection": "Pattern holds when task has clear pass/fail criteria"
  },
  ...
]
```

### Adoption Rule

**No contrast, no adoption.**
- If baseline passes all checks: no failure to fix; candidate is irrelevant; rejected.
- If candidate passes every check baseline fails: adopted.
- Otherwise: rejected; contrast recorded in ledger anyway.

This ensures evidence-driven improvement: only adopt changes that fix observed problems.

---

## 5. File Structure (Extend `.harness/`)

```
.harness/
├── README.md                           # [existing] PPC loop, adoption rule
├── ARCHITECTURE.md                     # [existing] data flow, boundaries
├── run_improvement.py                  # [UPDATE] add --parallel, --sequential, evidence collection
├── arch-rules.json                     # [existing] 15 ARCH-* rules
├── improvement/                        # [NEW] harnessing-level recursion
│   ├── lessons.jsonl                   # [NEW] evidence-backed lessons (append-only)
│   ├── reflection.md                   # [NEW] generated reflection on last batch
│   └── README.md                       # [NEW] adoption process, confidence scores
├── runs/                               # [NEW] resumable checkpoints (gitignored)
│   ├── .gitignore                      # [NEW] *.checkpoint, *.transcript
│   └── harness-ok/
│       ├── baseline/
│       │   ├── run.json                # [NEW] baseline probe metadata
│       │   └── transcript.txt          # [NEW] model output (gitignored)
│       └── 0001-explicit-verification/
│           ├── run.json                # [NEW] candidate probe metadata
│           └── transcript.txt          # [NEW] model output (gitignored)
├── tasks/                              # [existing] task definitions
│   └── harness-ok.json
├── candidates/                         # [existing] prompt overlays
│   ├── 0001-explicit-verification.md
│   └── 0002-state-first.md
├── decisions/                          # [existing] ADRs
│   └── 0001-adopt-harness-engineering.md
├── traces/                             # [existing] session observability
│   └── traces.jsonl
├── ledger.jsonl                        # [existing] probe contrasts (append-only)
└── improvement.md                      # [existing] generated report (do not edit)
```

---

## 6. Command Interface

### Via `zara-cli harness` or `/harness` command

```bash
# List tasks and candidates
zara-cli harness list

# Dry-run (plan without model calls)
zara-cli harness ppc --task harness-ok --mode parallel --k 2 --dry-run

# Execute parallel recursion (2K+1 model calls)
zara-cli harness ppc --task harness-ok --mode parallel --k 2

# Execute sequential recursion (2K+1 model calls, different order)
zara-cli harness ppc --task harness-ok --mode sequential --k 2

# Generate reflection from ledger
zara-cli harness reflect

# Resume after interruption
zara-cli harness resume --run-id harness-ok_20261107_133235

# Audit harness health
zara-cli harness audit

# Show improvement lessons
zara-cli harness lessons
```

---

## 7. Token Budget

### Injected into each probe

**System prompt edits (baseline):**
- Current Zara system prompt: ~200 tokens
- Baseline probe: no change
- **Budget used: 0 tokens**

**System prompt edits (candidate):**
- Candidate overlay body: ~100–200 tokens (e.g., "Add explicit verification step")
- Evidence from prior tasks: ~50–100 tokens (e.g., "This approach worked in task-1 because…")
- Reflection note: ~50 tokens (e.g., "Current bottleneck: hallucination in structured output")
- **Budget used: 200–450 tokens** (within 400-token target with margin)

**Per-turn total:** ~400 tokens average across baseline and candidate probes.

---

## 8. Test Plan (TDD)

All tests deterministic (no model calls); use mock transcripts and scoring.

### Unit Tests (`tests/harness/*.test.mjs`)

- [ ] `test/ppc.test.mjs` — Propose (generate candidates), Probe (run checks), Compose (adoption logic)
- [ ] `test/evidence.test.mjs` — Ledger entry schema, contrast collection, adoption rule
- [ ] `test/improvement.test.mjs` — Lesson extraction, reflection generation, confidence scoring
- [ ] `test/resume.test.mjs` — Checkpoint read/write, run recovery
- [ ] `test/parallel-vs-sequential.test.mjs` — Mode switching, budget tracking

### Integration Tests

- [ ] `make test` passes with new harness checks
- [ ] `zara-cli harness audit` identifies all `.harness/` files
- [ ] `zara-cli harness ppc --dry-run harness-ok` prints plan, exits 0
- [ ] `zara-cli harness lessons` reports adopted candidates from ledger

### E2E (one real probe)

- [ ] `zara-cli harness ppc --task harness-ok --mode parallel --k 1` completes (1 model call), appends ledger, updates improvement.md

---

## 9. Decisions and Trade-Offs

| Decision | Chosen | Rationale | Alternative |
|----------|--------|-----------|------------|
| **Probes in worktrees?** | No; use temp dirs + git clone | V2 ctx may not expose worktree API; temp dirs are portable | Git worktrees (less portable on Windows) |
| **Plugin vs. MCP?** | MCP tool (extend Orchestrator) | Zero required dependencies; no import needed | V2 plugin with `@opencode/plugin` import |
| **Improvement harness location** | `.harness/improvement/` (files + lessons.jsonl) | Part of harness, not middleware; queryable by agents | MCP tool (adds indirection) |
| **Adoption rule** | "No contrast, no adoption" | Evidence-driven; avoids accidental degradation | Always adopt (risk of bias) |
| **Parallel mode cost** | 2K+1 calls (K general + K domain + 1 baseline) | Explore wide, compose from evidence | K calls (one candidate per iteration) |
| **Resume mechanism** | `.harness/runs/` + checkpoint JSON | Resumable, auditable, queryable by agents | Memory-only state (lost on crash) |

---

## 10. Known Gaps (for Phase 3)

1. **Candidate generation:** Who proposes candidates? (deterministic rules, random perturbations, Harness² templates, agent?)
2. **Domain-specific editors:** How to generate "domain-specific" candidates vs. "general"? (no domain metadata yet)
3. **Scoring rubric:** How do checks map to "pass" vs. "fail"? (currently: exit 0 = pass)
4. **Evidence weighting:** How confident is a lesson from 1 task vs. 5 tasks? (need confidence formula)
5. **Multi-agent coordination:** How does Hive distribute parallel probes? (no existing Hive + probe integration)

---

## 11. Token Estimate

- **Injected context per turn:** ~400 tokens (baseline + candidate overlay + evidence)
- **Per-task cost:** 2K+1 model calls (parallel: K general + K domain + baseline)
- **Harness** (non-model): 1–2 tokens for ledger entry + reflection generation (negligible)

**Example:** 3 tasks × 2 candidates (k=2) × parallel = 3 × 5 model calls = 15 calls total. **Reasonable for a harness refinement run.**

---

## 12. Open Questions (Awaiting Approval)

1. **Candidate generators:** Deterministic (rule-based edits) or agent-based (Forge proposes)? Or both?
2. **Domain inference:** Should tasks carry a `domain` field? (e.g., "code-generation", "verification")
3. **Confidence thresholds:** Adopt lessons only if confidence ≥ X? (e.g., 0.7)
4. **Parallel execution:** Can Hive dispatch all probes concurrently, or only sequential?
5. **Resume UX:** Should `zara-cli harness resume` ask which run, or auto-detect latest?

---

## Summary

**What's new:**
- Parallel + sequential PPC modes in `.harness/run_improvement.py`
- Harnessing-level recursion: `.harness/improvement/lessons.jsonl` + reflection
- Resumable runs: `.harness/runs/` with checkpoint state
- Integration via MCP (extend Orchestrator; no new plugins)
- Token budget: ~400/turn; 2K+1 calls per task with k candidates

**What's reused:**
- 7/8 harness components (existing agents, skills, MCP, scripts)
- `.harness/` structure (tasks, candidates, decisions, ledger)
- 5-subsystem model (instructions, state, verification, scope, lifecycle)
- Adoption rule ("no contrast, no adoption")

**Ready for Phase 3?** Awaiting approval on 5 open questions (candidate generators, domain inference, confidence scoring, parallel execution, resume UX).

---

**Next:** Phase 3 implementation (TDD: write failing tests, then code).
