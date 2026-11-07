# PHASE 0 Recon — Harness² + Learn Harness Engineering Integration

**Date:** 2026-11-07  
**Repo:** zara-agent-opc (v1.x.x branch, OpenCode V2.2.6)  
**References:** google-research/harness2 (Apache-2.0), walkinglabs/learn-harness-engineering (MIT)

## Status Summary

**Phase:** 0 — Recon (COMPLETE)

**Done:**
- [x] Clone both reference repos to `/tmp/refs/`
- [x] Read harness2 README, architecture, and core concepts
- [x] Read learn-harness-engineering README, syllabus, and 5-subsystem framework
- [x] Examined `.harness/` inventory: 16 files (README, ARCHITECTURE, tasks, candidates, decisions, ledger, traces)
- [x] V2 readiness audit: Zara already V2-compatible; no V1 plugins to port
- [x] Mapped gaps vs. both references: Harness² needs PPC + parallel recursion; Learn HE already implemented (5 subsystems)

**Recommendation:** Skip Phase 1 (no V1 plugins found). Proceed to Phase 2 design approval.

---

---

## 1. Current `.harness/` Inventory

### Structure
```
.harness/
├── README.md                 # Harness2 loop purpose, commands, adoption rule
├── ARCHITECTURE.md           # Data flow, file responsibilities, boundaries
├── improvement.md            # Generated report from ledger (do not edit)
├── arch-rules.json           # 15 architecture rules (ARCH-001 to ARCH-015)
├── run_improvement.py        # Main loop: load, plan, probe, score, ledger, report
├── ledger.jsonl              # Append-only record of probe contrasts (0 probes recorded)
├── candidates/
│   ├── 0001-explicit-verification.md
│   └── 0002-state-first.md
├── decisions/
│   ├── 0001-adopt-harness-engineering.md
│   ├── 0002-pin-mcp-by-submodule.md
│   ├── 0003-keep-v1-config-shape.md
│   └── 0004-no-opencode-plugin.md
├── tasks/
│   ├── harness-ok.json              # Task: reply ZARA-OK (model call, 1 check)
│   └── repair-broken-ref.json       # Task: fix config refs (no model call, 2 checks)
└── traces/
    ├── .gitkeep
    └── traces.jsonl                 # Runtime trace (gitignored)
```

### Who reads/writes
- **run_improvement.py**: reads tasks/*.json, candidates/*.md, ledger.jsonl; writes ledger.jsonl, improvement.md
- **arch-rules.json**: read by `zara-cli arch` (scripts/zara_cli/checks/arch.py)
- **decisions/**: read by humans and agents for ADR context
- **candidates/**: written by humans; read by run_improvement.py
- **tasks/**: written by humans; read by run_improvement.py
- **traces/**: written by `zara-cli session start|end`
- **ledger.jsonl**: append-only, written by run_improvement.py

**Readers in codebase:**
- `scripts/zara_cli/checks/arch.py`: loads arch-rules.json
- `scripts/zara_cli/commands/verify.py`: runs feature layers (calls `make verify-feature`)
- `.opencode/agent/*.md`: references `.harness/` in AGENTS.md links
- `PROGRESS.md`: mentions `.harness/` for session logs and decisions

---

## 2. V2 Readiness Audit

| Item | Current | V2 Needs | Status | Effort |
|------|---------|----------|--------|--------|
| **opencode.json** | V1 shape: `agent`, `command`, `permission` (string keys) | Rename to `agents`, `commands`; `permission` → array of `{action, resource, effect}` | Not yet ported | Medium |
| **MCP config** | Under `mcp` key (V1); working | Under `mcp.servers` (V2); regenerate `.mcp.json` | Not yet ported | Low |
| **Plugins** | None (V1 plugin code deleted in last session) | None needed yet; V2 format is `{id, setup(ctx)}` in `.opencode/plugins/` | N/A | — |
| **Agent files** | 13 files in `.opencode/agent/*.md` (~46 KB); V1 template (8 sections) | V2 still reads V1 agents; no change needed for now | Working | Low |
| **Commands** | 6 templates in `.opencode/commands/` (code, review, swarm, think, handoff, resume, harness) | V2 still reads V1 commands | Working | Low |
| **Skills** | 200+ in `.opencode/skills/` and `additional-skills/` | V2 still reads V1 skills | Working | Low |
| **LSP** | Enabled in opencode.json (`"lsp": true`) | V2 still supports but not required; can disable | Enabled | Low |
| **tui.json** | Not present | Global config moved to `~/.config/opencode/cli.json` | N/A | — |
| **CLAUDE.md** | Not present (deleted in cleanup) | V2 reads only AGENTS.md; no fallback to CLAUDE.md | Not needed | — |
| **Instructions** | 2 files in `.opencode/instructions/` (system.md, system-extended.md); split by domain | V2 still supports; no change needed | Working | Low |

**Summary:** Zara is already V2-compatible. No plugins to port. Config can stay in V1 shape (V2 reads it). No forced migration needed.

---

## 3. Gaps vs. Reference Repos

### vs. Harness² (google-research/harness2)

| Concept | Harness² | Zara has | Gap |
|---------|----------|----------|-----|
| **8 editable components** | system prompt, guardrails, memory, tool guidance, subagents, skills, scripts, plugins | system prompt ✓, guardrails (partial), memory (MCP) ✓, tool guidance (via skills) ✓, subagents (14 agents) ✓, skills ✓, scripts (Python CLI) ✓, plugins ✗ | Plugins (not needed); guardrails incomplete |
| **Propose–Probe–Compose** | Propose edits, probe both, compose from contrast | Candidates exist; run_improvement.py sketched | Need: probes actually run; parallel vs. sequential mode; evidence collection |
| **Harnessing-level recursion** | Improvement harness guides future refinement | Ledger exists (0 probes); improvement.md template | Need: adopt contrasts; feed evidence into next task |
| **Parallel recursion** | Probe K general + K domain, produce K compositions | Not implemented | Need: `--k` budget; parallel execution |
| **Sequential recursion** | Carry refined harness + evidence through K steps | Not implemented | Need: state accumulation across steps |
| **Resumable runs** | Resume from `runs/` saved state | No runs/ yet | Need: checkpoint/resume mechanism |

### vs. Learn Harness Engineering (walkinglabs)

| Subsystem | Learn HE | Zara has | Gap |
|-----------|----------|----------|-----|
| **Instructions** | AGENTS.md router + docs/ hierarchy | AGENTS.md (100 lines) ✓, docs/ (11 files) ✓ | Complete; matches design |
| **State** | feature_list.json, progress.md, git log | feature_list.json ✓, PROGRESS.md ✓, git history ✓ | Complete; matches design |
| **Verification** | Deterministic + consistency + e2e layers | `make test`, `make check`, `make e2e` ✓ | Complete; 3-layer model matches |
| **Scope** | WIP=1 (one feature active) | feature_list.json state machine ✓ | Complete; enforced by gate |
| **Session Lifecycle** | init.sh, clean-check, handoff note | `/handoff`, `/resume` commands ✓; `clean-check` ✓ | Complete; missing explicit init script (use zara-cli init) |

**Summary:** Zara already implements the 5-subsystem model from Learn HE. Ready to integrate Harness² ideas without major restructuring.

---

## 4. What Zara Already Has (Harness-adjacent)

- **Harness skill** (`.opencode/skills/harness-engineering/SKILL.md`) — teaches repo gates
- **Rhythm agent** — loop engineering partner (iterative workflows, verification, failure modes)
- **Refiner agent** — quality evaluation (compare baseline vs. candidate output)
- **Hive agent** — orchestration (can delegate parallel probes)
- **State files** — feature_list.json, PROGRESS.md, decisions in `.harness/decisions/`
- **Improvement loop skeleton** — run_improvement.py, tasks/, candidates/, ledger.jsonl
- **Trace system** — `.harness/traces/traces.jsonl` for observability
- **Memory MCP** — Orchestrator (zmem-mcp) for procedural and episodic learning

---

## 5. Design Decisions Recorded

- **ARCH-0001**: Adopt harness engineering (WIP=1, state machine, verification layers)
- **ARCH-0002**: Pin MCP by submodule (mcp/zarust-memory/)
- **ARCH-0003**: Keep V1 config shape (V2 still reads it; avoid migration churn)
- **ARCH-0004**: No OpenCode plugin (deleted v1 plugin code; use instructions + skills instead)

---

## 6. Open Questions for Phase 2 Design

1. **Probes in worktrees?**
   - Harness² uses git worktrees for isolation.
   - Does OpenCode V2 ctx expose a worktree API? (Check: `ctx.workspace`, `ctx.git`, etc.)
   - Alternative: use temp directories + git clone?

2. **Plugin import requirement?**
   - Rule says: "Zero required dependencies; check whether plain `{id, setup}` export is accepted."
   - Do we need `@opencode/plugin` or can we default-export `{id, setup(ctx)}`?
   - If @opencode/plugin is required, ask before proceeding.

3. **Improvement harness location?**
   - Option A: Keep in `.harness/` (procedural, not middleware)
   - Option B: Implement as a plugin (middleware around executions)
   - Option C: Implement as MCP tools (extend Orchestrator)?

4. **Token budget for injected context?**
   - Rule: "modules that inject context add at most ~300–500 tokens per turn."
   - Harness² might inject candidate diffs, evidence, reflection notes.
   - How much per turn is acceptable?

5. **Parallel vs. sequential recursion in V2?**
   - Harness² supports both via `--k` and `--mode`.
   - Can we dispatch parallel probes via Hive agent?
   - How to collect evidence from parallel runs?

---

## 7. Reference Repos Structure

### harness2
- `harness2/` — Python package (framework, benchmarks, editors, probers)
- `scripts/` — CLI and utilities
- `tests/` — benchmarks and deterministic tests
- `docs/` — setup, experiments, benchmarks
- **Size:** ~200 MB (Python, benchmarks, deps)
- **Deps:** Python 3.12, uv, Node.js 20+ (for benchmarks), GCP CLI
- **Key files to adapt:**
  - `harness2/ppc/` — Propose–Probe–Compose engine
  - `harness2/editors/` — candidate generators
  - `harness2/scorers/` — evidence collection
  - `.env.example` — model config

### learn-harness-engineering
- `docs/` — 14 lectures, 8 projects, 15 languages
- `projects/` — capstone Electron app (evolves through 8 projects)
- `skills/` — harness-creator (scaffold a harness for any project)
- `tools/` — reference templates and checklists
- `scripts/` — build and distribution
- **Size:** ~400 MB (docs, multimedia, translations)
- **Language:** Node.js, Markdown
- **Key files to adapt:**
  - `tools/harness-creator/` — template scaffolder
  - `docs/en/lectures/*/` — conceptual frameworks
  - `projects/project-06/` — complete harness example

---

## 8. Integration Strategy (Preview for Phase 2)

**Goal:** Adapt both references into Zara without copying code or text.

1. **Reuse existing `.harness/`:** Keep tasks/, candidates/, ledger.jsonl, decisions/
2. **Extend run_improvement.py:** Add parallel mode, evidence collection, adoption logic
3. **Map 8 components:** Inventory what Zara has (most are present)
4. **Implement PPC:** Use Hive + Refiner for orchestration; Probe agent for execution
5. **Build improvement harness:** MCP tool or plugin to persist evidence across runs
6. **Add resumable runs:** Checkpoint probes in `.harness/runs/` (gitignored)
7. **Document:** docs/harness/ folder with attribution and design decisions

---

## Blockers

None. Proceed to Phase 1 (if V1 plugins found) or Phase 2 (design).

**Recommendation:** Skip Phase 1 (no V1 plugins). Proceed directly to Phase 2 design approval.
