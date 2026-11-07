# Harness Engineering — Quick Start

This directory contains the implementation of Harness² + Learn Harness Engineering integration into Zara (OpenCode V2).

## What is a Harness?

A **harness** is the system around a model that enables it to act as an agent reliably: prompts, tools, memory, skills, orchestration, and more. **Harnessing** is the process of optimizing that system.

Zara implements two levels of recursion:
- **Task-level:** Refine harness for a single task via Propose–Probe–Compose (PPC)
- **Harnessing-level:** Extract lessons from adopted candidates to guide future refinement

## Quick Start

### List tasks and candidates

```bash
zara-cli harness list
```

Output:
```
Tasks found: 2
  ['harness-ok', 'repair-broken-ref']
Candidates found: 2
  ['0001-explicit-verification', '0002-state-first']
```

### Plan a PPC run (no model calls)

```bash
# Parallel: probe k general + k domain candidates
zara-cli harness ppc --task harness-ok --mode parallel --k 1 --dry-run

# Sequential: carry refined harness through k iterations
zara-cli harness ppc --task harness-ok --mode sequential --k 2 --dry-run
```

### Audit harness health

```bash
zara-cli harness audit
```

### Generate reflection from ledger

After running probes, generate a markdown summary:

```bash
zara-cli harness reflect
```

This creates `.harness/improvement/reflection.md` with adoption statistics.

### Show improvement lessons

```bash
zara-cli harness lessons
```

Lists evidence-backed lessons extracted from adopted candidates.

## Architecture

### Files

- `.harness/tasks/*.json` — Task definitions (goal, checks, probe model flag)
- `.harness/candidates/*.md` — Prompt overlays (proposed changes to test)
- `.harness/ledger.jsonl` — Append-only probe records (baseline, candidate, checks, adopted, evidence)
- `.harness/improvement/lessons.jsonl` — Evidence-backed lessons (confidence, applicability)
- `.harness/improvement/reflection.md` — Generated reflection (adoption rate, insights)

### Key Concepts

**Adoption rule:** "No contrast, no adoption"
- A candidate is adopted ONLY if:
  1. Baseline had at least one check failure
  2. Candidate passes ALL checks baseline failed
  3. Candidate does not break ANY check baseline passed

**Confidence scoring:** `min(1.0, adopted_count / 3)`
- Encourages lessons from multiple tasks
- Default threshold: 0.7 (70% confidence to extract)

## Implementation

### Core Classes

**Evidence Collection**
- `EvidenceCollector` — Track baseline/candidate checks, compute adoption

**Task & Probe Orchestration**
- `TaskDefinition` — Load task from JSON (name, prompt, checks)
- `TaskLoader` — Load tasks from `.harness/tasks/` directory
- `ProbeResult` — Track passed/failed checks from a probe
- `PPCRunner` — Orchestrate dry-run, baseline probe, candidate probe, adoption compose

**Ledger & Harnessing**
- `LedgerEntry` — Single probe record (ts, task, candidate, checks, adopted, duration)
- `LedgerManager` — Append-only persistence (ledger.jsonl), queries by task/adopted
- `Lesson` — Evidence-backed pattern (what changed, why, confidence, applicability)
- `ImprovementHarness` — Extract lessons, generate reflection from ledger

**CLI Commands**
- `ListCommand` — Inventory of tasks and candidates
- `DryRunCommand` — Plan PPC run (parallel/sequential, model call budget)
- `ReflectCommand` — Generate reflection.md from ledger
- `LessonsCommand` — Query lessons.jsonl
- `AuditCommand` — Verify harness structure health

### Module Location

```
scripts/zara_cli/harness/
├── evidence.py           (adoption logic, ledger entry)
├── test_runner.py        (task loading, PPC orchestration)
├── test_improvement.py   (ledger queries, lesson extraction)
├── test_commands.py      (CLI commands)
└── __init__.py           (exports 16 classes)
```

## Testing

All implementation is test-driven (TDD). Run tests with:

```bash
python scripts/zara_cli/harness/evidence.py -v
python scripts/zara_cli/harness/test_runner.py -v
python scripts/zara_cli/harness/test_improvement.py -v
python scripts/zara_cli/harness/test_commands.py -v
```

Or run the verification script:

```bash
cd scripts && python verify_harness.py
```

## References

- **Harness² paper:** https://arxiv.org/pdf/2610.14224
- **Learn Harness Engineering:** https://github.com/walkinglabs/learn-harness-engineering
- **Attribution:** `.harness/docs/ATTRIBUTION.md`

## Next: Running Real Probes

Once you have candidate overlays in `.harness/candidates/`, execute a real PPC run:

```bash
zara-cli harness ppc --task harness-ok --mode parallel --k 1
```

This will:
1. Run baseline probe (1 model call if `probe_model: true`)
2. Run candidate probe(s) (1 call per candidate)
3. Collect evidence and append to ledger.jsonl
4. Compose adoption decision
5. Update improvement.md

See `.harness/docs/` for detailed design and verification results.
