# Attribution — Harness Engineering References

This document records the sources and licenses for concepts, patterns, and frameworks adapted into Zara's harness system.

## References

### 1. Harness² — Recursive Agent Harnessing for an Open World

**Repository:** https://github.com/google-research/harness2  
**License:** Apache 2.0  
**Commit SHA (recon):** (shallow clone, main branch 2026-11-07)  
**Paper:** [Harness²: Recursive Agent Harnessing for an Open World](https://arxiv.org/pdf/2610.14224)

**Concepts Adapted:**
- 8 editable harness components (system prompt, guardrails, memory, tool guidance, subagents, skills, scripts, plugins)
- Propose–Probe–Compose (PPC) task-level recursion (parallel and sequential modes)
- Harnessing-level recursion with improvement harness and evidence-backed lessons
- Adoption rule: "no contrast, no adoption" (candidate adopted only when passing checks baseline fails)
- Resumable runs with checkpoint/recovery mechanism

**Zara Integration:**
- Task-level PPC implemented in `.harness/run_improvement.py` (already sketched)
- 8 components mapped to existing Zara modules (agents, skills, MCP, instructions)
- Evidence collection via ledger.jsonl (append-only, no ground-truth required)
- Parallel probes orchestrated via Hive agent; Refiner compares contrasts

**Adaptation Notes:**
- Harness² uses Python 3.12 + uv; Zara uses same stack (compatible)
- Harness² runs benchmarks (JobBench, LAB, WorkBuddy-Bench); Zara runs repo gates and feature verification
- No code copied; PPC design paraphrased and integrated into existing `.harness/` structure
- Improvements to candidates implemented as `.md` overlays, not prompt patches

---

### 2. Learn Harness Engineering — A Project-Based Course

**Repository:** https://github.com/walkinglabs/learn-harness-engineering  
**License:** MIT  
**Commit SHA (recon):** (shallow clone, main branch 2026-11-07)  
**Website:** https://walkinglabs.github.io/learn-harness-engineering/

**Concepts Adapted:**
- 5 subsystems framework: Instructions, State, Verification, Scope, Session Lifecycle
- Repository as single source of truth (no state in chat; all tracked files)
- Progressive disclosure structure (AGENTS.md router, not an encyclopedia)
- WIP=1 constraint (one feature active; explicit definition of done)
- Multi-session continuity via persisted state (progress.md, feature_list.json, git log)
- Verification layers: deterministic (L1), consistency (L2), end-to-end (L3)
- Clean session lifecycle: init.sh at start, clean-check at end, handoff note for resume

**Zara Integration:**
- 5 subsystems already implemented (Zara adopted this framework in Session 002)
- feature_list.json as harness primitive (tracks state: planned→active→passing)
- PROGRESS.md as continuity mechanism (verified state, next steps, blockers)
- `/handoff` and `/resume` commands for multi-session workflows
- `make test`, `make check`, `make e2e` as 3-layer verification gates

**Adaptation Notes:**
- No code copied; course lectures paraphrased into design decisions
- Template structure (AGENTS.md, feature_list, init script) already in place
- Zara's skill-creator can now guide future projects on same principles
- Attribution via DECISIONS.md (ADRs indexed by topic)

---

## License Compliance

- Harness² (Apache 2.0): Commercial use, modification, and distribution allowed with attribution and license notice
- Learn Harness Engineering (MIT): Commercial use, modification, and distribution allowed with attribution and license notice

Both are included in this document. No code, text, or assets are copied verbatim.

---

## How This Helps Zara

1. **Harness² PPC:** Enables refinement of prompts/tasks/tools without ground-truth feedback; evidence-driven adoption
2. **Learn HE 5 subsystems:** Provides proven framework for reliable agent execution across sessions
3. **Combined:** Creates a full loop: plan task → probe contrasts → improve harness → persist evidence → next task

---

## References for Future Work

- Harness² docs: `docs/BENCHMARKS.md`, `docs/EXPERIMENTS.md`, `docs/SETUP.md`
- Learn HE docs: `docs/en/lectures/` (14 lectures), `tools/` (templates), `skills/harness-creator/`
- Zara decisions: `.harness/decisions/` (ARCH-0001 through ARCH-0004)

Last updated: 2026-11-07
