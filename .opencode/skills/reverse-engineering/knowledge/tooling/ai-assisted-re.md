# AI/ML for Reverse Engineering

TL;DR: ML augments RE at specific subtasks (function boundaries, similarity, variable naming) but does NOT replace traditional analysis. Best results come from hybrid systems: ML for heuristics, formal methods for correctness. Full neural decompilation is unreliable for production use.

---

## What Works Today (Reliability Matrix)

| Task | Reliability | Production Ready? |
|------|-------------|-------------------|
| Function boundary detection | High (90-99% F1) | Yes (XDA) |
| Known-vulnerability matching | Medium-High | Yes, with human verification |
| Variable name suggestion | Low-Medium | Useful as hint only |
| Comment generation | Medium | Context aid |
| Full neural decompilation | Low | No |
| Zero-day discovery | Low | Research only |
| Cross-arch binary diffing | Medium | With threshold tuning |
| Deobfuscation | Low-Medium | Research only |

---

## Function Boundary Detection

| Approach | Result | Year |
|----------|--------|------|
| XDA | 99.0% F1 boundaries, 99.7% F1 instructions | 2021 |
| Disa | +9-13% F1 on obfuscated binaries | 2025 |
| DisasLLM | LLM-driven, handles junk-byte obfuscation | 2024 |

**Caveat**: Benchmarks use compiler-generated code. Hand-written asm and computed jumps still cause failures.

---

## Type/Variable Recovery

| Approach | Task | Year |
|----------|------|------|
| DIRTY | Variable names & types from decompiler output | 2023 |
| ProTST | Progressive transformer, 7 tasks, +14.8% avg | 2025 |
| ReCopilot | Expert LLM, +13% vs tools/general LLMs | 2025 |

---

## Binary Similarity & Diffing

| Approach | Cross-Arch | Obfuscation Resistance | Best For |
|----------|------------|------------------------|----------|
| BinDiff | Limited | Low | Same-compiler diffing |
| SAFE | Yes | Medium | Cross-compiler/arch |
| VexIR2Vec | Yes | High | Max obfuscation resistance |
| PalmTree | Yes | Medium | Instruction embeddings |

**Practical guidance**:
- Same compiler, same arch: BinDiff
- Cross-compiler/arch: SAFE or VexIR2Vec
- False positive rates: 5-15% in realistic settings

---

## Decompiler Improvements

### LLM-Based Tools

| Tool | Type | Integration |
|------|------|-------------|
| DAILA | Plugin (Ghidra/IDA/BN) | Python API + GUI, LLM renaming/comments |
| GhidraMCP | MCP Server | LLM autonomously navigates Ghidra |
| IDA-Pro-MCP | MCP Server | LLM controls IDA via MCP |
| LLM4Decompile | Model | End-to-end assembly-to-C |
| ReCopilot | Expert LLM | Multi-task binary analysis |

### Integration Patterns

1. **Sidecar**: Decompiler sends code to LLM, gets suggestions back (DAILA)
2. **Agent**: LLM controls decompiler via MCP, autonomous navigation (GhidraMCP)
3. **Embedded**: ML inside analysis pipeline (rare, best latency)

### Useful Subtasks (Today)

- Variable name suggestion (hint, not ground truth)
- Comment generation (context for analyst)
- Library function identification
- Calling convention inference

---

## Deobfuscation

### Tiered Resistance Model (LLMs vs Obfuscation)

| Tier | Technique | LLM Performance |
|------|-----------|-----------------|
| Low | Bogus control flow | Handles well |
| Moderate | Control flow flattening | Partial success |
| High | Combined instruction sub + CF transform | Fails consistently |

### Effective Approach: Symbolic + Neural Hybrid

ML suggests target structures, symbolic execution verifies correctness. Example: MODeflattener uses symbolic execution to recover switch-case from OLLVM-flattened functions.

---

## Automated Vulnerability Discovery

### ML-Guided Fuzzing

- LLM fuzz target generation (reduce harness manual overhead)
- Vulnerability-oriented fuzzing: +34.2% discovery rate over AFL (LAVA-M)
- AIxCC 2025: CRS found 28 vulns (6 zero-days), patched 14
- FuzzingBrain V2: 90% detection rate, 29 confirmed zero-days

**Reality check**: ML adds marginal value over well-engineered traditional fuzzing for most targets. Helps most where human expertise was previously required for harness/target selection.

---

## Fundamental Limitations

1. **Semantic gap**: Assembly is lower-fidelity than source. Compiler provably discards info.
2. **Optimization destroys signal**: -O2/-O3 inlining erases semantic boundaries. Performance drops sharply above -O1.
3. **Obfuscation is adversarial**: Designed to resist automated analysis. ML currently lags in the arms race.
4. **Evaluation inflation**: Benchmark results on SPEC CPU != real-world firmware/malware.
5. **Token limits**: LLMs struggle with functions >1000 instructions.

---

## The Hybrid Pattern (Emerging Consensus)

ML is NOT replacing program analysis. Best results:
- ML suggests variable types -> symbolic execution verifies
- LLM identifies function boundaries -> disassembler verifies via call graph
- Neural embedding finds candidate similar functions -> BinDiff confirms structurally
- ML for speed/coverage, traditional analysis for correctness
