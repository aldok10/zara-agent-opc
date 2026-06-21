# AI/ML for Reverse Engineering

> Practical reference: what works, what doesn't, and where the field stands as of 2025-2026.

## Table of Contents

1. [Scope and Motivation](#scope-and-motivation)
2. [Function Boundary Detection](#function-boundary-detection)
3. [Type Reconstruction and Variable Recovery](#type-reconstruction-and-variable-recovery)
4. [Decompiler Improvements via ML](#decompiler-improvements-via-ml)
5. [Binary Similarity and Diffing](#binary-similarity-and-diffing)
6. [Function Embedding](#function-embedding)
7. [Binary Code Search](#binary-code-search)
8. [Automated Vulnerability Discovery](#automated-vulnerability-discovery)
9. [Deobfuscation via Deep Learning](#deobfuscation-via-deep-learning)
10. [Tooling and Integration](#tooling-and-integration)
11. [Limitations and Realistic Expectations](#limitations-and-realistic-expectations)
12. [References](#references)

---

## Scope and Motivation

AI/ML methods for reverse engineering span a wide range of tasks: finding function boundaries in stripped binaries, recovering variable names and types, detecting similar code across architectures, searching binary corpora by semantics, and automating vulnerability discovery. The field has moved from hand-engineered feature pipelines to transformer-based models and LLM-driven agents, but practical gains remain uneven.

This document surveys the landscape with a focus on what a working reverse engineer can actually use today. Each section covers the problem definition, key approaches, reported results, and caveats.

---

## Function Boundary Detection

### Problem

Stripped binaries lack symbol tables. The first step in any analysis pipeline is recovering function starts and ends. Traditional disassemblers use heuristics (prologue patterns, call targets, relocation tables) that break under obfuscation, aggressive optimization, or exotic compilers [3].

### ML Approaches

**XDA (NDSS 2021)** uses transfer learning with a masked-language-modeling pretext task on raw byte sequences. Fine-tuned for function boundary and instruction recovery, it achieves 99.0% F1 for function boundaries and 99.7% F1 for instruction recovery, surpassing prior heuristics while running up to 38x faster than IDA Pro on stripped x86/x64 Windows and Linux binaries [3][7].

**Disa** improves on XDA with attention mechanisms, specifically targeting obfuscated binaries. It reports 9.1% and 13.2% F1 improvement over prior deep-learning disassembly on binaries obfuscated by disassembly desynchronization and source-level obfuscators respectively [1].

**DisasLLM** takes an LLM-driven approach: a classifier determines whether each decoded instruction is correct, then a strategy module chains correct decodes end-to-end. Designed for junk-byte obfuscation that defeats linear sweep and recursive traversal [5].

| Approach | Task | Reported Result | Year |
|----------|------|----------------|------|
| XDA | Function boundaries | 99.0% F1 | 2021 |
| XDA | Instruction recovery | 99.7% F1 | 2021 |
| Disa | Obfuscated boundaries | +9.1-13.2% F1 vs prior DL | 2025 |
| DisasLLM | Junk-byte resistance | Outperforms heuristics | 2024 |

### Caveats

Benchmark binaries tend to be compiler-generated with clean boundaries. Hand-written assembly, inline asm, and computed jump tables still cause failures. Adversarial examples can fool neural boundary detectors with small perturbations [2].

---

## Type Reconstruction and Variable Recovery

### Problem

Compilation discards type information. Variable names, struct layouts, function signatures, and even basic types (int vs pointer) are lost. Recovering them from stripped binaries is essential for readable decompilation.

### ML Approaches

**DIRTY** (Chen et al., 2023) uses a Transformer encoder-decoder that consumes decompiler output tokens and variable size information to predict variable names and types. It demonstrated substantial gains over static analysis baselines on Hex-Rays decompiler output [6][11].

**ByteTR** recovers variable types by decoupling the target type set to handle unbalanced distributions and applying static program analysis to mitigate compiler optimization effects [10]. It addresses a core problem: optimization blurs the distinction between stack slots, registers, and memory locations.

**ProTST** (2025) uses a progressive transformer with hierarchical training where knowledge flows from fundamental tasks (e.g., instruction boundary detection) to specialized ones (type recovery, function naming). It reports 14.8% average improvement (F1, MRR, Recall@1) over traditional two-stage training across seven binary analysis tasks [18].

**ReCopilot** (2025) is an expert LLM for multi-task binary analysis including variable name/type inference, struct recovery, and function name prediction. It achieves state-of-the-art on comprehensive benchmarks, outperforming existing tools and general LLMs by 13% on decompiled pseudo-code [20].

| Approach | Task | Reported Result | Year |
|----------|------|----------------|------|
| DIRTY | Variable names & types | Substantial gain over static analysis | 2023 |
| ByteTR | Variable types | Addresses optimization-induced ambiguity | 2025 |
| ProTST | 7 binary analysis tasks | +14.8% avg vs two-stage | 2025 |
| ReCopilot | Names, types, structs | +13% vs tools/LLMs | 2025 |

### REBench

The lack of standardized evaluation has been a persistent problem. **REBench** (2025) consolidates existing datasets into a procedural, fair-by-construction benchmark spanning multiple architectures and optimization levels, enabling apples-to-apples comparison for type and name recovery tasks [13].

---

## Decompiler Improvements via ML

### Problem

Traditional decompilers (Ghidra, Hex-Rays, Binary Ninja) produce correct but unreadable output. Variable names are generic, types are imprecise, and control flow is flattened. ML can augment decompiler output at multiple stages.

### LLM-Based Decompilation

**LLM4Decompile** fine-tunes open LLMs on (assembly, source) pairs for end-to-end decompilation. The project has released multiple model versions and datasets, showing that LLMs can generate compilable and executable C code from stripped binaries — though reliability drops sharply on optimized code [22].

**Control-Flow-Augmented Decompilation** (CIW, 2025) enhances LLM decompilation by explicitly injecting control flow structure. On benchmarks it achieves 9.16% improvement in re-executability and 15.26% in re-compilability over vanilla LLM approaches [23].

**SALT4Decompile** abstracts binary-level operations (specific jumps, calling conventions) into a source-level logic tree before decompilation, guiding LLM semantic recovery [24].

**SK2Decompile** applies a two-phase approach: first recover the skeleton (control flow, function boundaries), then fill in the skin (expressions, types). Reports 21.6% re-executability gain over GPT-5-mini on HumanEval [25].

### Neural-Augmented Plugins

**DAILA** is a decompiler-agnostic plugin (Ghidra, IDA, Binary Ninja) that connects to local and remote LLMs. It exposes AI features through both scripting and GUI interfaces, enabling inline renaming, commenting, and type suggestions [14][15].

**GhidraMCP** and **IDA-Pro-MCP** expose Ghidra/IDA functionality as MCP (Model Context Protocol) servers, allowing LLMs to autonomously navigate binaries, decompile functions, and cross-reference — all through natural language [16][17].

### What's Actually Useful Today

The most reliable gains come from augmenting specific subtasks rather than full decompilation:
- Variable name suggestion (low precision, high recall ceiling)
- Comment generation (useful for context, not for correctness)
- Library function identification
- Calling convention inference

Full end-to-end neural decompilation remains unreliable for production use, especially at higher optimization levels (-O2, -O3) [6][13].

---

## Binary Similarity and Diffing

### Problem

Given two binary functions (or entire binaries), determine whether they are semantically similar. Applications: patch analysis, malware variant detection, vulnerability search, code provenance.

### Classic Tools

**BinDiff** (now open-source from Google) uses graph isomorphism on call graphs and control flow graphs, augmented with instruction-level hashing. It is the de facto standard for binary diffing but struggles across different compilers, optimization levels, and architectures [26][27].

### ML-Based Approaches

**Gemini** (2017) was an early GNN-based approach for cross-platform binary similarity. It embeds control flow graphs using structure2vec. While seminal, its practical accuracy is limited by graph isomorphism ambiguity [28].

**SAFE** (Self-Attentive Function Embeddings, 2019) works directly on instruction sequences without building CFGs. It uses a self-attention mechanism to aggregate instruction embeddings into a function-level vector. Faster than graph-based methods and works on stripped binaries across architectures [9][8].

**Asm2Vec** uses a PV-DM (Paragraph Vector - Distributed Memory) model over assembly token sequences. It learns function embeddings by predicting instruction context. Strong on compiler/optimization variation but requires architecture-specific training [28].

**Instruction2Vec** uses Word2Vec-style embeddings at the instruction level combined with CNN for software weakness detection. More a feature extractor than a standalone similarity engine [10].

**PalmTree** (2021) pre-trains an assembly language model using three self-supervised tasks: masked instruction prediction, CFG neighbor prediction, and instruction ordering. The resulting instruction embeddings improve downstream binary analysis tasks [12].

**BinBert** (2022) is a Transformer pre-trained on assembly sequences plus symbolic execution traces. Unlike PalmTree, it is fine-tunable end-to-end, allowing task-specific re-training [19].

**VexIR2Vec** (2024) operates on VEX IR (Valgrind/angr) rather than raw assembly, making it architecture-neutral. It includes a peephole optimization engine (VexINE) that normalizes IR before embedding. Reports 3.2x speedup over closest competitor and superior precision/recall across compilers, optimization levels, and obfuscations [4].

**IRBinDiff** combines a pre-trained language model with graph neural networks on LLVM-IR for contrastive learning of similarity. Designed explicitly to mitigate compilation differences [1].

| Approach | Representation | Cross-Arch | Obfuscation Resistance | Year |
|----------|---------------|------------|----------------------|------|
| BinDiff | CFG + call graph | Limited | Low | 2004 |
| Gemini | CFG embeddings | Yes | Low | 2017 |
| SAFE | Instruction sequence | Yes | Medium | 2019 |
| Asm2Vec | Instruction tokens | No | Low | 2019 |
| PalmTree | Instruction embeddings | Yes | Medium | 2021 |
| BinBert | Assembly + symbolic | Yes | Medium | 2022 |
| VexIR2Vec | VEX IR peepholes | Yes | High | 2024 |
| IRBinDiff | LLVM-IR + GNN | Yes | Medium | 2024 |

### Practical Guidance

For within-compiler, same-architecture diffing: BinDiff remains the practical choice. For cross-compiler, cross-architecture scenarios: SAFE or VexIR2Vec. For maximal obfuscation resistance: VexIR2Vec, though with higher computational cost. None of these approaches are reliable enough for automated triage without human verification — false positive rates of 5-15% are typical in realistic settings [28][1].

---

## Function Embedding

### Problem

Function embedding is the foundation task for binary similarity, code search, and vulnerability matching. The goal is a dense vector representation that captures semantic function behavior while being invariant to syntactic variation.

### Taxonomy of Embedding Approaches

| Category | Examples | Unit of Embedding | Training Signal |
|----------|----------|-------------------|-----------------|
| Instruction-level | PalmTree, Instruction2Vec | Single instruction | Self-supervised (context prediction) |
| Sequence-level | SAFE, Asm2Vec | Function as token sequence | Siamese / contrastive |
| Graph-level | Gemini, VexIR2Vec | CFG / peephole graph | Contrastive + graph isomorphism |
| Transformer | BinBert, kTrans | Full function with context | Masked LM + downstream fine-tuning |

### Key Design Decisions

1. **Representation**: Raw bytes vs assembly vs IR. IR-based approaches (VexIR2Vec) generalize better across architectures but lose some low-level signal.

2. **Granularity**: Whole-function vs basic-block vs instruction. Instruction-level embeddings compose into function-level ones via pooling or attention.

3. **Training objective**: Contrastive (pull similar functions together, push dissimilar apart) vs predictive (masked instruction modeling) vs hybrid.

4. **kTrans** (2023) adds explicit domain knowledge injection into the Transformer framework, fusing implicit pre-training with explicit semantic features. This points toward a hybrid future where learned representations are augmented with program analysis results [21].

### Practical Considerations

- Embedding dimension: 128-512 is typical. Higher dimensions increase discrimination but hurt retrieval speed.
- Indexing: FAISS or similar approximate nearest neighbor search is required for corpora > 10^5 functions.
- Domain shift: Embeddings trained on one compiler/arch family degrade on unseen ones. Fine-tuning is often necessary.

---

## Binary Code Search

### Problem

Given a natural language query or a code snippet, find matching binary functions in a large corpus. This is the binary analogue of code search engines like GitHub Code Search.

### Approaches

**CodeBERT** and **GraphCodeBERT** are pre-trained on bimodal (code, NL) data. When applied to binary code, they require bridging the semantic gap between decompiled pseudo-code and natural language queries. Performance degrades significantly compared to source-code search [29].

**Virtual Compiler for Assembly Code Search** (2024) proposes treating assembly as a "compiled" view and learning a joint embedding space with natural language. This avoids the decompilation bottleneck [30].

**BinBert** can be fine-tuned for code search tasks by treating its assembly embeddings as query/document representations. Its inclusion of symbolic execution traces gives it an edge on semantics-heavy queries [19].

**ProTST**'s unified embedding space enables cross-task search: the same embedding used for type recovery can also serve similarity search, reducing the need for task-specific models [18].

### Current State

Binary code search with natural language queries is significantly behind source-code search (e.g., CodeSearchNet). The semantic gap between assembly/natural language is large, and training data is scarce. ReCopilot and similar LLM-based approaches that operate on decompiled pseudo-code are currently the most practical path [20][29].

---

## Automated Vulnerability Discovery

### Problem

Can ML find vulnerabilities in binaries without source code access? This ranges from patch-gap analysis (find unpatched known vulnerabilities across binaries) to zero-day discovery.

### ML for Known- Vulnerability Matching

This is the most successful application area. Binary similarity techniques (SAFE, VexIR2Vec, BinDiff) can identify whether a binary contains a function similar to a known vulnerable function. Key challenges:
- One-line patches produce near-identical binaries
- Backported patches change function structure
- Different compilation options produce different code for the same source

### ML-Guided Fuzzing

LLM-augmented fuzzing is an active research area:

- **LLM fuzz target generation**: Using LLMs to generate harness code for black-box libraries, reducing the manual overhead of fuzzing setup [31].

- **Vulnerability-oriented fuzzing**: Fine-tuned LLMs predict high-risk code regions from static analysis features, then guide AFL-style fuzzers toward those targets. Reported 34.2% improvement in vulnerability discovery rate over AFL on the LAVA-M benchmark [32].

- **Cyber Reasoning Systems (CRS)**: At AIxCC 2025, LLM-powered CRS systems autonomously discovered 28 vulnerabilities (including 6 zero-days) in real-world C/Java projects and patched 14 [33]. **FuzzingBrain V2** achieved 90% detection rate on competition binaries and found 29 zero-days confirmed by maintainers [34].

### Realistic Assessment

ML-guided fuzzing shows genuine promise. The AIxCC results are the most concrete evidence that LLM-augmented vulnerability discovery works in controlled settings. However, competition binaries are smaller and cleaner than real-world firmware. The fuzzing community consensus is that ML adds marginal value over well-engineered traditional fuzzing for most targets — it helps most where human expertise was previously required for harness/target selection [31][35].

---

## Deobfuscation via Deep Learning

### Problem

Code obfuscation transforms binaries to resist reverse engineering. Common techniques: control flow flattening, bogus control flow, instruction substitution, junk bytes, opaque predicates. ML-based deobfuscation aims to reverse these transformations.

### ML Approaches

**DisasLLM** tackles junk-byte obfuscation at the disassembly level, using an LLM to distinguish real instructions from obfuscation padding [5].

**CFG reconstruction with LLMs**: Recent work on control-flow-augmented decompilation implicitly deobfuscates by reconstructing high-level control flow from flattened/wrapped binary code [23].

**Tiered resistance model** (2025): A systematic evaluation of LLM deobfuscation capabilities establishes a three-tier model [10]:
- **Low resistance**: Bogus control flow (LLMs handle well)
- **Moderate resistance**: Control flow flattening (partial success)
- **High resistance**: Combined instruction substitution + control flow transformation (LLMs fail consistently)

### Symbolic + Neural Hybrids

The most effective deobfuscation approaches combine ML with symbolic execution. For example, MODeflattener uses symbolic execution to recover switch-case structures from OLLVM-flattened functions. ML can suggest the target structures; symbolic execution verifies correctness. This hybrid pattern — ML for heuristics, formal methods for verification — is recurring across the field [10].

---

## Tooling and Integration

### Available Tools

| Tool | Type | Targets | Access Method |
|------|------|---------|---------------|
| DAILA | Plugin | Ghidra, IDA, Binary Ninja | Python API + GUI |
| GhidraMCP | MCP Server | Ghidra | MCP protocol |
| IDA-Pro-MCP | MCP Server | IDA Pro | MCP protocol |
| ReVa | MCP Server | Ghidra | MCP protocol |
| Rikugan | Plugin | IDA, Ghidra, Binary Ninja | AI agent integration |
| Reverser AI | CLI | Local LLMs | CLI |
| LLM4Decompile | Model | Assembly-to-C | Transformers library |
| codex-decompiler | Plugin | Ghidra | OpenAI API |

### Integration Patterns

1. **Sidecar**: Decompiler sends decompiled code to an LLM service, gets suggestions back. DAILA demonstrates this pattern for renaming and commenting [14].

2. **Agent**: The LLM controls the decompiler through an MCP server, calling analysis functions autonomously. GhidraMCP and IDA-Pro-MCP use this pattern, enabling "vibe reversing" workflows [16][17].

3. **Embedded**: The ML model runs inside the decompiler's analysis pipeline. This is the hardest integration but offers the best latency and reliability. Rare in practice — most vendors prefer API-based integration.

---

## Limitations and Realistic Expectations

### Fundamental Limitations

1. **Semantic gap**: Assembly is a lower-fidelity representation than source code. No amount of ML can recover information the compiler provably discarded (e.g., which local variable corresponded to which source variable) [6][13].

2. **Optimization destroys signal**: -O2 and -O3 inlining, constant propagation, and dead code elimination erase semantic boundaries that ML models rely on. Performance drops sharply above -O1 [11][19].

3. **Obfuscation is adversarial**: Obfuscation techniques are designed to resist automated analysis. ML models trained on unobfuscated or mildly obfuscated data fail on advanced protections. This is an arms race, and ML currently lags [10][5].

4. **Evaluation inflation**: Most papers report results on synthetic benchmarks (e.g., SPEC CPU) or small curated datasets. Performance on real-world firmware, malware, or legacy binaries is often substantially lower [13][28].

5. **Token limits**: LLM-based approaches struggle with large functions (>1000 instructions). Context window constraints force truncation, which removes critical structural information [17].

### What Works Today

| Task | Reliability | Production Ready? |
|------|-------------|-------------------|
| Function boundary detection | High (90-99% F1) | Yes (XDA) |
| Known-vulnerability matching | Medium-High | Yes, with human verification |
| Variable name suggestion | Low-Medium | Useful as hint, not ground truth |
| Comment generation | Medium | Useful for context |
| Full decompilation (neural) | Low | No |
| Zero-day vulnerability discovery | Low | Research only |
| Cross-arch binary diffing | Medium | With careful threshold tuning |
| Obfuscation-resistant disassembly | Low-Medium | Research only |

### The Hybrid Future

The emerging consensus: ML is not replacing program analysis. The best results come from hybrid systems where ML models provide heuristics and suggestions, and formal methods (symbolic execution, SMT solvers, abstract interpretation) provide guarantees. Examples:
- ML suggests variable types → symbolic execution verifies consistency
- LLM identifies likely function boundaries → disassembler verifies via call graph
- Neural embedding finds candidate similar functions → BinDiff confirms via structural matching

This pattern — ML for speed and coverage, traditional analysis for correctness — defines the practical frontier.

---

## References

1. IRBinDiff: Binary Code Similarity Detection via Graph Contrastive Learning on Intermediate Representations. arXiv:2410.18561, 2024.
   [https://arxiv.org/abs/2410.18561](https://arxiv.org/abs/2410.18561)

2. Black-box Attacks Against Neural Binary Function Detection. arXiv:2208.11667, 2022.
   [https://arxiv.org/abs/2208.11667](https://arxiv.org/abs/2208.11667)

3. XDA: Accurate, Robust Disassembly with Transfer Learning. NDSS 2021.
   [https://www.ndss-symposium.org/ndss-paper/xda-accurate-robust-disassembly-with-transfer-learning/](https://www.ndss-symposium.org/ndss-paper/xda-accurate-robust-disassembly-with-transfer-learning/)

4. VexIR2Vec: An Architecture-Neutral Embedding Framework for Binary Similarity. ACM TOSEM, 2024.
   [https://arxiv.org/abs/2312.00507](https://arxiv.org/abs/2312.00507)

5. DisasLLM: Disassembling Obfuscated Executables with LLM. arXiv:2407.08924, 2024.
   [https://arxiv.org/abs/2407.08924](https://arxiv.org/abs/2407.08924)

6. Revisiting Deep Learning for Variable Type Recovery. arXiv:2304.03854, 2023.
   [https://arxiv.org/abs/2304.03854](https://arxiv.org/abs/2304.03854)

7. Accurate Learning-based Static Disassembly with Attentions. arXiv:2507.07246, 2025.
   [https://arxiv.org/abs/2507.07246](https://arxiv.org/abs/2507.07246)

8. SAFE: Self-Attentive Function Embeddings for Binary Similarity. DIMVA 2019.
   [https://link.springer.com/chapter/10.1007/978-3-030-22038-9_15](https://link.springer.com/chapter/10.1007/978-3-030-22038-9_15)

9. SAFE: a step into the creation of embeddings for binary code similarity detection (overview).
   [https://medium.com/@massarelli/safe-self-attentive-function-embedding-d80abbfea794](https://medium.com/@massarelli/safe-self-attentive-function-embedding-d80abbfea794)

10. A Four-Dimensional Framework for Evaluating LLM Assembly Code Deobfuscation Capabilities. arXiv:2505.19887, 2025.
    [https://arxiv.org/abs/2505.19887](https://arxiv.org/abs/2505.19887)

11. Instruction2vec: Efficient Preprocessor of Assembly Code to Detect Software Weakness with CNN. Applied Sciences, 2019.
    [https://www.mdpi.com/2076-3417/9/19/4086](https://www.mdpi.com/2076-3417/9/19/4086)

12. PalmTree: Learning an Assembly Language Model for Instruction Embedding. CCS 2021.
    [https://arxiv.org/abs/2103.03809](https://arxiv.org/abs/2103.03809)

13. REBench: A Procedural, Fair-by-Construction Benchmark for LLMs on Stripped-Binary Types and Names. arXiv:2604.27319, 2025.
    [https://arxiv.org/abs/2604.27319](https://arxiv.org/abs/2604.27319)

14. DAILA: A Decompiler-Agnostic Plugin for Interacting with AI in Your Decompiler.
    [https://github.com/mahaloz/DAILA](https://github.com/mahaloz/DAILA)

15. Using LLMs as a Reverse Engineering Sidekick. Cisco Talos Blog.
    [https://blog.talosintelligence.com/using-llm-as-a-reverse-engineering-sidekick/](https://blog.talosintelligence.com/using-llm-as-a-reverse-engineering-sidekick/)

16. GhidraMCP: Model Context Protocol Server for Ghidra.
    [https://github.com/LaurieWired/GhidraMCP](https://github.com/LaurieWired/GhidraMCP)

17. Challenges and Future Directions in Agentic Reverse Engineering Systems. arXiv:2604.14317, 2025.
    [https://arxiv.org/abs/2604.14317](https://arxiv.org/abs/2604.14317)

18. ProTST: A Progressive Transformer for Unifying Binary Code Embedding and Knowledge Transfer. SANER 2025.
    [https://arxiv.org/abs/2412.11177](https://arxiv.org/abs/2412.11177)

19. BinBert: Binary Code Understanding with a Fine-tunable and Execution-aware Transformer. arXiv:2208.06692, 2022.
    [https://arxiv.org/abs/2208.06692](https://arxiv.org/abs/2208.06692)

20. ReCopilot: Reverse Engineering Copilot in Binary Analysis. arXiv:2505.16366, 2025.
    [https://arxiv.org/abs/2505.16366](https://arxiv.org/abs/2505.16366)

21. kTrans: Knowledge-Aware Transformer for Binary Code Embedding. arXiv:2308.12659, 2023.
    [https://arxiv.org/abs/2308.12659](https://arxiv.org/abs/2308.12659)

22. LLM4Decompile: Decompiling Binary Code with Large Language Models. arXiv:2403.05286, 2024.
    [https://arxiv.org/abs/2403.05286](https://arxiv.org/abs/2403.05286)

23. Control Flow-Augmented Decompiler based on Large Language Model. arXiv:2503.07215, 2025.
    [https://arxiv.org/abs/2503.07215](https://arxiv.org/abs/2503.07215)

24. SALT4Decompile: Inferring Source-level Abstract Logic Tree for LLM-Based Binary Decompilation. arXiv:2509.14646, 2025.
    [https://arxiv.org/abs/2509.14646](https://arxiv.org/abs/2509.14646)

25. SK2Decompile: LLM-based Two-Phase Binary Decompilation from Skeleton to Skin. arXiv:2509.22114, 2025.
    [https://arxiv.org/abs/2509.22114](https://arxiv.org/abs/2509.22114)

26. BinDiff: Quickly Find Differences and Similarities in Disassembled Code. Google Open Source.
    [https://github.com/google/bindiff](https://github.com/google/bindiff)

27. BinDiff Manual. zynamics.
    [http://zynamics.com/bindiff/manual/](http://zynamics.com/bindiff/manual/)

28. A Survey of Binary Code Similarity. ACM Computing Surveys, 2019.
    [https://arxiv.org/abs/1909.11424](https://arxiv.org/abs/1909.11424)

29. How Far Have We Gone in Binary Code Understanding Using Large Language Models. arXiv:2404.09836, 2024.
    [https://arxiv.org/abs/2404.09836](https://arxiv.org/abs/2404.09836)

30. Virtual Compiler Is All You Need For Assembly Code Search. arXiv:2408.06385, 2024.
    [https://arxiv.org/abs/2408.06385](https://arxiv.org/abs/2408.06385)

31. LLM-Augmented Fuzz Target Generation for Black-box Libraries. arXiv:2507.15058, 2025.
    [https://arxiv.org/abs/2507.15058](https://arxiv.org/abs/2507.15058)

32. Research on the Vulnerability Identification Efficiency of Enhanced Reverse-Analyzed LLM Model in Binary Program Fuzz Testing. Preprints, 2025.
    [https://www.preprints.org/manuscript/202510.1106/v1](https://www.preprints.org/manuscript/202510.1106/v1)

33. An LLM-Powered System for Automated Vulnerability Detection and Patching. arXiv:2509.07225, 2025.
    [https://arxiv.org/abs/2509.07225](https://arxiv.org/abs/2509.07225)

34. FuzzingBrain V2: A Multi-Agent LLM System for Automated Vulnerability Discovery and Reproduction. arXiv:2605.21779, 2025.
    [https://arxiv.org/abs/2605.21779](https://arxiv.org/abs/2605.21779)

35. Potentials and Challenges of Large Language Models for Reverse Engineering. arXiv:2509.21821, 2025.
    [https://arxiv.org/abs/2509.21821](https://arxiv.org/abs/2509.21821)

36. Neural Machine Translation Inspired Binary Code Similarity Comparison beyond Function Pairs. arXiv:1808.04706, 2018.
    [https://arxiv.org/abs/1808.04706](https://arxiv.org/abs/1808.04706)

37. COBRA-GCN: Contrastive Learning to Optimize Binary Representation Analysis with Graph Convolutional Networks. DIMVA 2022.
    [https://link.springer.com/chapter/10.1007/978-3-031-09484-2_4](https://link.springer.com/chapter/10.1007/978-3-031-09484-2_4)

38. Source Code Foundation Models are Transferable Binary Analysis Knowledge Bases. arXiv:2405.19581, 2024.
    [https://arxiv.org/abs/2405.19581](https://arxiv.org/abs/2405.19581)
