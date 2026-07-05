# AI Engineering References

Authoritative references covering RAG, agents, context engineering, MCP, evaluation, LLMOps, fine-tuning, AI security, and foundational research. Organized by category.

---

## Foundational Papers & Books

| # | Title | URL | Why It Matters |
|---|-------|-----|----------------|
| 1 | Attention Is All You Need (Vaswani et al. 2017) | https://arxiv.org/abs/1706.03762 | Introduced the Transformer architecture that underpins all modern LLMs |
| 2 | BERT: Pre-training of Deep Bidirectional Transformers (Devlin et al. 2019) | https://arxiv.org/abs/1810.04805 | Established bidirectional pre-training for NLU tasks and embeddings |
| 3 | Language Models are Few-Shot Learners (GPT-3, Brown et al. 2020) | https://arxiv.org/abs/2005.14165 | Demonstrated in-context learning and scaling emergent abilities |
| 4 | Scaling Laws for Neural Language Models (Kaplan et al. 2020) | https://arxiv.org/abs/2001.08361 | Power-law relationships between compute, data, parameters, and loss |
| 5 | Training Compute-Optimal Large Language Models (Chinchilla, Hoffmann et al. 2022) | https://arxiv.org/abs/2203.15556 | Showed most models are undertrained -- data matters as much as params |
| 6 | Constitutional AI (Bai et al. 2022) | https://arxiv.org/abs/2212.08073 | Self-supervised alignment via principles -- foundation for RLHF alternatives |
| 7 | GPT-4 Technical Report (OpenAI 2023) | https://arxiv.org/abs/2303.08774 | State of the art reasoning/multimodal capabilities and safety work |
| 8 | LLaMA: Open and Efficient Foundation Models (Touvron et al. 2023) | https://arxiv.org/abs/2302.13971 | Proved competitive open-weight models are possible at smaller scale |
| 9 | Mistral 7B (Jiang et al. 2023) | https://arxiv.org/abs/2310.06825 | Efficient architecture with sliding window attention and grouped-query attention |
| 10 | The Illustrated Transformer (Jay Alammar) | https://jalammar.github.io/illustrated-transformer/ | Best visual explanation of transformer internals for practitioners |
| 11 | Speech and Language Processing (Jurafsky & Martin) | https://web.stanford.edu/~jurafsky/slp3/ | Standard NLP textbook -- free online, continuously updated |
| 12 | Designing Machine Learning Systems (Chip Huyen, O'Reilly 2022) | https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/ | Production ML systems design -- data, infra, monitoring, iteration |
| 13 | Build a Large Language Model From Scratch (Sebastian Raschka 2024) | https://www.manning.com/books/build-a-large-language-model-from-scratch | Hands-on understanding of LLM internals from tokenization to RLHF |

---

## RAG (Retrieval-Augmented Generation)

| # | Title | URL | Why It Matters |
|---|-------|-----|----------------|
| 14 | Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks (Lewis et al. 2020) | https://arxiv.org/abs/2005.11401 | The original RAG paper -- combines retrieval with generation |
| 15 | HyDE: Hypothetical Document Embeddings (Gao et al. 2022) | https://arxiv.org/abs/2212.10496 | Generate hypothetical answers to improve retrieval query quality |
| 16 | RAPTOR: Recursive Abstractive Processing for Tree-Organized Retrieval (Sarthi et al. 2024) | https://arxiv.org/abs/2401.18059 | Hierarchical summarization tree for multi-level retrieval |
| 17 | Corrective RAG (Yan et al. 2024) | https://arxiv.org/abs/2401.15884 | Self-reflective retrieval with relevance grading and web fallback |
| 18 | Self-RAG: Learning to Retrieve, Generate, and Critique (Asai et al. 2023) | https://arxiv.org/abs/2310.11511 | Train model to decide when and what to retrieve on-the-fly |
| 19 | ColBERT: Efficient and Effective Passage Search via Late Interaction (Khattab & Zaharia 2020) | https://arxiv.org/abs/2004.12832 | Token-level interaction for better relevance with BERT-scale efficiency |
| 20 | Lost in the Middle (Liu et al. 2023) | https://arxiv.org/abs/2307.03172 | Models attend poorly to middle context -- critical for RAG chunk ordering |
| 21 | Pinecone Documentation | https://docs.pinecone.io/ | Managed vector DB with metadata filtering and hybrid search |
| 22 | Weaviate Documentation | https://weaviate.io/developers/weaviate | Open-source vector DB with built-in hybrid search and modules |
| 23 | Qdrant Documentation | https://qdrant.tech/documentation/ | Rust-based vector DB with filtering, quantization, and multitenancy |
| 24 | Chroma Documentation | https://docs.trychroma.com/ | Lightweight embedded vector DB ideal for prototyping and small-scale |
| 25 | pgvector | https://github.com/pgvector/pgvector | Vector search in Postgres -- use existing infra without new DB |
| 26 | Unstructured.io | https://docs.unstructured.io/ | Document parsing and chunking pipeline for diverse file formats |
| 27 | LlamaIndex Documentation | https://docs.llamaindex.ai/ | Framework for building RAG pipelines with composable retrievers |
| 28 | Sentence Transformers (SBERT) | https://www.sbert.net/ | State of the art embedding models for semantic search |
| 29 | MTEB: Massive Text Embedding Benchmark | https://huggingface.co/spaces/mteb/leaderboard | Standardized embedding model comparison across tasks |
| 30 | Cohere Rerank | https://docs.cohere.com/docs/reranking | Cross-encoder reranking API for improving retrieval precision |
| 31 | BM25 (Robertson & Zaragoza 2009) | https://www.staff.city.ac.uk/~sbrp622/papers/foundations_bm25_review.pdf | Classical sparse retrieval baseline -- essential for hybrid search |
| 32 | Query Decomposition for RAG (Langchain blog) | https://blog.langchain.dev/query-construction/ | Breaking complex queries into sub-queries for better retrieval |

---

## Agents & Multi-Agent Systems

| # | Title | URL | Why It Matters |
|---|-------|-----|----------------|
| 33 | ReAct: Synergizing Reasoning and Acting (Yao et al. 2022) | https://arxiv.org/abs/2210.03629 | Interleave reasoning traces with actions -- foundational agent pattern |
| 34 | Toolformer: Language Models Can Teach Themselves to Use Tools (Schick et al. 2023) | https://arxiv.org/abs/2302.04761 | Self-supervised tool use learning -- models decide when to call tools |
| 35 | Tree of Thoughts (Yao et al. 2023) | https://arxiv.org/abs/2305.10601 | Deliberate problem-solving with exploration and backtracking |
| 36 | Graph of Thoughts (Besta et al. 2023) | https://arxiv.org/abs/2308.09687 | DAG-structured reasoning allowing merging and refining thoughts |
| 37 | Reflexion: Language Agents with Verbal Reinforcement Learning (Shinn et al. 2023) | https://arxiv.org/abs/2303.11366 | Self-reflection loop for agent learning from trial and error |
| 38 | Generative Agents: Interactive Simulacra (Park et al. 2023) | https://arxiv.org/abs/2304.03442 | Long-term memory architecture for believable agent behavior |
| 39 | AutoGen: Enabling Next-Gen LLM Applications (Wu et al. 2023) | https://arxiv.org/abs/2308.08155 | Multi-agent conversation framework from Microsoft Research |
| 40 | CrewAI Documentation | https://docs.crewai.com/ | Role-based multi-agent orchestration with delegation |
| 41 | LangGraph Documentation | https://langchain-ai.github.io/langgraph/ | Stateful agent graphs with cycles, persistence, and human-in-the-loop |
| 42 | OpenAI Function Calling | https://platform.openai.com/docs/guides/function-calling | Standard pattern for structured tool use with LLMs |
| 43 | Anthropic Tool Use | https://docs.anthropic.com/en/docs/build-with-claude/tool-use | Claude's tool use patterns with error handling and streaming |
| 44 | Voyager: An Open-Ended Embodied Agent (Wang et al. 2023) | https://arxiv.org/abs/2305.16291 | Skill library and curriculum learning for open-ended exploration |
| 45 | LATS: Language Agent Tree Search (Zhou et al. 2023) | https://arxiv.org/abs/2310.04406 | MCTS-inspired search for LLM agents -- planning with backtracking |
| 46 | TaskWeaver (Microsoft 2023) | https://github.com/microsoft/TaskWeaver | Code-first agent framework for complex data analytics tasks |
| 47 | The Landscape of Emerging AI Agent Architectures (Masterman et al. 2024) | https://arxiv.org/abs/2404.11584 | Survey of agent architecture patterns and their tradeoffs |
| 48 | AgentBench (Liu et al. 2023) | https://arxiv.org/abs/2308.03688 | Benchmark suite for evaluating LLM agents across environments |

---

## Context Engineering

| # | Title | URL | Why It Matters |
|---|-------|-----|----------------|
| 49 | Anthropic Prompt Engineering Guide | https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering | Official best practices for system prompts and context structuring |
| 50 | OpenAI Prompt Engineering Guide | https://platform.openai.com/docs/guides/prompt-engineering | Standard reference for prompt patterns across OpenAI models |
| 51 | Chain-of-Thought Prompting (Wei et al. 2022) | https://arxiv.org/abs/2201.11903 | Step-by-step reasoning dramatically improves complex task performance |
| 52 | Prompt Caching (Anthropic) | https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching | Reduce latency and cost by caching static prompt prefixes |
| 53 | LLMLingua: Compressing Prompts for Accelerated Inference (Jiang et al. 2023) | https://arxiv.org/abs/2310.05736 | Token-level prompt compression without quality degradation |
| 54 | MemGPT: Towards LLMs as Operating Systems (Packer et al. 2023) | https://arxiv.org/abs/2310.08560 | Virtual context management with tiered memory for unbounded context |
| 55 | Structured Outputs (OpenAI) | https://platform.openai.com/docs/guides/structured-outputs | Guaranteed JSON schema compliance for reliable LLM outputs |
| 56 | System Prompts Collection (Anthropic) | https://docs.anthropic.com/en/docs/about-claude/use-case-guides | Real-world system prompt patterns organized by use case |
| 57 | Many-Shot In-Context Learning (Agarwal et al. 2024) | https://arxiv.org/abs/2404.11018 | Hundreds of examples in context outperform few-shot on many tasks |
| 58 | Needle In A Haystack Test | https://github.com/gkamradt/LLMTest_NeedleInAHaystack | Benchmark for measuring context window utilization effectiveness |
| 59 | Context Window Extension Techniques Survey (Chen et al. 2023) | https://arxiv.org/abs/2401.07872 | RoPE scaling, ALiBi, and other methods for extending context |
| 60 | DSPy: Programming--Not Prompting--Foundation Models (Khattab et al. 2023) | https://arxiv.org/abs/2310.03714 | Programmatic prompt optimization replacing manual engineering |
| 61 | Skeleton-of-Thought (Ning et al. 2023) | https://arxiv.org/abs/2307.15337 | Parallel generation guided by outline for faster responses |

---

## MCP (Model Context Protocol)

| # | Title | URL | Why It Matters |
|---|-------|-----|----------------|
| 62 | MCP Specification (Anthropic) | https://modelcontextprotocol.io/specification | The protocol spec -- transport, capabilities, lifecycle |
| 63 | MCP TypeScript SDK | https://github.com/modelcontextprotocol/typescript-sdk | Reference implementation for building MCP servers in TypeScript |
| 64 | MCP Python SDK | https://github.com/modelcontextprotocol/python-sdk | Reference implementation for building MCP servers in Python |
| 65 | MCP Servers Repository | https://github.com/modelcontextprotocol/servers | Official and community MCP server implementations |
| 66 | Building MCP Servers Guide | https://modelcontextprotocol.io/docs/concepts/servers | Architecture patterns for tool, resource, and prompt servers |
| 67 | MCP Transport: stdio vs SSE vs Streamable HTTP | https://modelcontextprotocol.io/docs/concepts/transports | When to use each transport and their tradeoffs |
| 68 | MCP Inspector | https://github.com/modelcontextprotocol/inspector | Debugging and testing tool for MCP server development |
| 69 | MCP Resources and Prompts | https://modelcontextprotocol.io/docs/concepts/resources | Exposing contextual data and prompt templates via MCP |
| 70 | MCP Sampling | https://modelcontextprotocol.io/docs/concepts/sampling | Server-initiated LLM requests -- agent-within-a-tool pattern |
| 71 | Anthropic MCP Blog Post | https://www.anthropic.com/news/model-context-protocol | Launch announcement explaining the vision and ecosystem |
| 72 | OpenAI Agents SDK (tools/MCP support) | https://github.com/openai/openai-agents-python | OpenAI's agent framework with MCP client support |
| 73 | skills.sh | https://skills.sh/ | Skill marketplace for AI agents -- shareable context packages |

---

## Evaluation & Quality

| # | Title | URL | Why It Matters |
|---|-------|-----|----------------|
| 74 | RAGAS Framework | https://docs.ragas.io/ | Standard RAG evaluation metrics: faithfulness, relevance, context recall |
| 75 | Judging LLM-as-a-Judge (Zheng et al. 2023) | https://arxiv.org/abs/2306.05685 | MT-Bench and Chatbot Arena -- LLM evaluation using LLM judges |
| 76 | MMLU Benchmark (Hendrycks et al. 2021) | https://arxiv.org/abs/2009.03300 | 57-subject knowledge benchmark -- standard capability measurement |
| 77 | HumanEval (Chen et al. 2021) | https://arxiv.org/abs/2107.03374 | Code generation benchmark with functional correctness testing |
| 78 | SWE-bench (Jimenez et al. 2024) | https://arxiv.org/abs/2310.06770 | Real-world software engineering benchmark from GitHub issues |
| 79 | DeepEval | https://docs.confident-ai.com/ | Open-source LLM evaluation framework with 14+ metrics |
| 80 | Braintrust | https://www.braintrust.dev/docs | Eval platform with logging, scoring, and experiment tracking |
| 81 | Langsmith (LangChain) | https://docs.smith.langchain.com/ | Tracing, evaluation, and monitoring for LLM applications |
| 82 | OpenAI Evals | https://github.com/openai/evals | OpenAI's evaluation framework and registry of benchmarks |
| 83 | Promptfoo | https://www.promptfoo.dev/docs/ | CLI tool for testing prompts across models with assertions |
| 84 | G-Eval: NLG Evaluation using GPT-4 (Liu et al. 2023) | https://arxiv.org/abs/2303.16634 | Chain-of-thought based LLM evaluation outperforms traditional metrics |
| 85 | HELM: Holistic Evaluation of Language Models (Liang et al. 2022) | https://arxiv.org/abs/2211.09110 | Multi-scenario, multi-metric evaluation framework from Stanford |
| 86 | AlpacaEval | https://github.com/tatsu-lab/alpaca_eval | Automatic evaluator for instruction-following models |
| 87 | Chatbot Arena / LMSYS Leaderboard | https://chat.lmsys.org/ | Elo-rated human preference benchmark via blind comparisons |
| 88 | TruLens | https://www.trulens.org/ | Instrumentation and evaluation for LLM apps with feedback functions |
| 89 | Inspect AI (UK AISI) | https://inspect.ai-safety-institute.org.uk/ | UK AI Safety Institute's framework for model evaluations |

---

## LLMOps & Deployment

| # | Title | URL | Why It Matters |
|---|-------|-----|----------------|
| 90 | vLLM | https://docs.vllm.ai/ | PagedAttention for high-throughput serving -- the default OSS inference engine |
| 91 | Text Generation Inference (TGI) | https://huggingface.co/docs/text-generation-inference | HuggingFace's production serving with continuous batching |
| 92 | Ollama | https://ollama.com/ | Local model running made trivial -- prototyping and development |
| 93 | LiteLLM | https://docs.litellm.ai/ | Unified API proxy for 100+ LLM providers with load balancing |
| 94 | OpenRouter | https://openrouter.ai/docs | Multi-provider routing with fallback and cost optimization |
| 95 | Semantic Caching (GPTCache) | https://github.com/zilliztech/GPTCache | Cache similar queries to reduce cost and latency |
| 96 | NeMo Guardrails | https://github.com/NVIDIA/NeMo-Guardrails | Programmable safety rails for LLM conversational systems |
| 97 | Guardrails AI | https://www.guardrailsai.com/docs | Output validation and structured generation with retry logic |
| 98 | Weights & Biases (W&B) for LLMs | https://docs.wandb.ai/guides/prompts | Experiment tracking, prompt versioning, and LLM monitoring |
| 99 | Langfuse | https://langfuse.com/docs | Open-source LLM observability -- traces, scores, cost tracking |
| 100 | Phoenix (Arize) | https://docs.arize.com/phoenix | Open-source LLM observability with trace visualization |
| 101 | SGLang | https://github.com/sgl-project/sglang | Fast serving with RadixAttention for structured generation |
| 102 | Model Router Pattern (Martian) | https://docs.withmartian.com/ | Intelligent model routing based on query complexity |
| 103 | Token Cost Optimization Patterns (Anthropic) | https://docs.anthropic.com/en/docs/build-with-claude/optimize-costs | Batch API, caching, model selection -- practical cost reduction |

---

## Fine-tuning

| # | Title | URL | Why It Matters |
|---|-------|-----|----------------|
| 104 | LoRA: Low-Rank Adaptation of Large Language Models (Hu et al. 2021) | https://arxiv.org/abs/2106.09685 | Parameter-efficient fine-tuning -- train 0.1% of params, get 95% quality |
| 105 | QLoRA: Efficient Finetuning of Quantized LLMs (Dettmers et al. 2023) | https://arxiv.org/abs/2305.14314 | 4-bit quantization + LoRA -- fine-tune 65B models on single GPU |
| 106 | DPO: Direct Preference Optimization (Rafailov et al. 2023) | https://arxiv.org/abs/2305.18290 | RLHF without the RL -- simpler alignment from preference data |
| 107 | ORPO: Monolithic Preference Optimization without Reference Model (Hong et al. 2024) | https://arxiv.org/abs/2403.07691 | Single-stage preference optimization combining SFT and alignment |
| 108 | Training Language Models to Follow Instructions with Human Feedback (InstructGPT, Ouyang et al. 2022) | https://arxiv.org/abs/2203.02155 | Original RLHF paper -- instruction following via human preferences |
| 109 | Axolotl | https://github.com/axolotl-ai-cloud/axolotl | Streamlined fine-tuning tool supporting LoRA, QLoRA, full fine-tune |
| 110 | Unsloth | https://github.com/unslothai/unsloth | 2-5x faster fine-tuning with 80% less memory via kernel optimization |
| 111 | OpenAI Fine-tuning Guide | https://platform.openai.com/docs/guides/fine-tuning | Managed fine-tuning with distillation and evaluation |
| 112 | Self-Instruct (Wang et al. 2022) | https://arxiv.org/abs/2212.10560 | Generate instruction data from seed -- bootstrap training sets |
| 113 | LIMA: Less Is More for Alignment (Zhou et al. 2023) | https://arxiv.org/abs/2305.11206 | 1000 curated examples can outperform large noisy datasets |
| 114 | Magpie: Alignment Data Synthesis (Xu et al. 2024) | https://arxiv.org/abs/2406.08464 | Self-synthesis of high-quality alignment data from the model itself |
| 115 | The Alignment Handbook (HuggingFace) | https://github.com/huggingface/alignment-handbook | Recipes for DPO, RLHF, and SFT with transformers + TRL |

---

## AI Security

| # | Title | URL | Why It Matters |
|---|-------|-----|----------------|
| 116 | OWASP Top 10 for LLM Applications | https://owasp.org/www-project-top-10-for-large-language-model-applications/ | Industry standard threat taxonomy for LLM systems |
| 117 | OWASP AI Security and Privacy Guide | https://owasp.org/www-project-ai-security-and-privacy-guide/ | Broader AI security beyond just LLMs -- training, deployment, ops |
| 118 | Not What You've Signed Up For: Compromising Real-World LLM-Integrated Apps (Greshake et al. 2023) | https://arxiv.org/abs/2302.12173 | Indirect prompt injection attacks via retrieved content |
| 119 | Prompt Injection Primer (Simon Willison) | https://simonwillison.net/2023/Apr/14/worst-that-can-happen/ | Practical breakdown of prompt injection risks and mitigations |
| 120 | Universal and Transferable Adversarial Attacks on Aligned LLMs (Zou et al. 2023) | https://arxiv.org/abs/2307.15043 | Automated adversarial suffixes that transfer across models |
| 121 | Red Teaming Language Models (Perez et al. 2022) | https://arxiv.org/abs/2202.03286 | Systematic approach to finding model failures and harmful outputs |
| 122 | Anthropic Responsible Disclosure & Safety | https://www.anthropic.com/research | Anthropic's approach to model safety research and red teaming |
| 123 | Rebuff: Prompt Injection Detector | https://github.com/protectai/rebuff | Multi-layer defense against prompt injection attempts |
| 124 | LLM Guard (Protect AI) | https://llm-guard.com/ | Input/output scanning for PII, toxicity, prompt injection |
| 125 | Garak: LLM Vulnerability Scanner | https://github.com/NVIDIA/garak | Automated red teaming and vulnerability scanning for LLMs |
| 126 | MITRE ATLAS (Adversarial Threat Landscape for AI) | https://atlas.mitre.org/ | ATT&CK-style framework for AI/ML system threats |
| 127 | Lakera Guard | https://www.lakera.ai/ | Real-time prompt injection and content policy enforcement |
| 128 | Data Poisoning Attacks on LLMs (Wan et al. 2023) | https://arxiv.org/abs/2302.10149 | Backdoor attacks through training data manipulation |
| 129 | Model Extraction Attacks (Tramèr et al. 2016) | https://arxiv.org/abs/1609.02943 | Stealing ML models through query access -- foundational work |

---

## Orchestration & Delegation

| # | Title | URL | Why It Matters |
|---|-------|-----|----------------|
| 130 | OpenAI Swarm (experimental) | https://github.com/openai/swarm | Lightweight multi-agent orchestration with handoffs |
| 131 | Anthropic's Multi-Agent Research | https://www.anthropic.com/research/building-effective-agents | Patterns for building effective agents -- when to use agents vs workflows |
| 132 | Temporal.io for AI Workflows | https://docs.temporal.io/ | Durable execution for long-running AI pipelines with retry/compensation |
| 133 | Prefect for ML/AI Pipelines | https://docs.prefect.io/ | Python-native workflow orchestration with observability |
| 134 | Human-in-the-Loop Patterns (LangGraph) | https://langchain-ai.github.io/langgraph/concepts/human_in_the_loop/ | When and how to interrupt agent execution for human review |
| 135 | Delegation Framework: Prompt-as-Spec | -- | Treat every AI delegation as a spec: context, constraints, acceptance criteria |
| 136 | AI Pair Programming Best Practices | -- | Trust calibration, verification boundaries, skill maintenance patterns |

---

## Quality Gates & Verification

| # | Title | URL | Why It Matters |
|---|-------|-----|----------------|
| 137 | Mutation Testing for AI-Generated Code | https://stryker-mutator.io/ | Verify test suite adequacy by injecting faults -- catch false confidence |
| 138 | Semgrep for AI Code Review | https://semgrep.dev/docs/ | Static analysis rules to catch patterns AI commonly gets wrong |
| 139 | CodeQL | https://codeql.github.com/docs/ | Deep semantic code analysis for security vulnerabilities |
| 140 | AI Code Review: A Systematic Literature Review (Fan et al. 2024) | https://arxiv.org/abs/2404.18496 | Meta-analysis of AI-assisted code review effectiveness |
| 141 | Trust but Verify: LLM Output Validation Patterns | -- | Boundary checking, contract testing, and edge case verification for AI output |
| 142 | Property-Based Testing (Hypothesis) | https://hypothesis.readthedocs.io/ | Generate test cases automatically -- catches edge cases AI misses |

---

## Skill Maintenance & Meta-Learning

| # | Title | URL | Why It Matters |
|---|-------|-----|----------------|
| 143 | The Bitter Lesson (Rich Sutton 2019) | http://www.incompleteideas.net/IncsightIdeas/BitterLesson.html | General methods that scale compute always win -- informs when to trust AI |
| 144 | Situational Awareness (Leopold Aschenbrenner 2024) | https://situational-awareness.ai/ | Forecasting AI capabilities trajectory -- plan your skill investments |
| 145 | AI-Assisted Programming: Practices and Pitfalls | -- | Avoiding vibe-coding debt, maintaining fundamentals, deliberate practice |
| 146 | Cognitive Load Theory Applied to AI Delegation | -- | Match task complexity to delegation strategy -- routine/ambiguous/novel |

---

## Additional Key Resources

| # | Title | URL | Why It Matters |
|---|-------|-----|----------------|
| 147 | Hugging Face Transformers Library | https://huggingface.co/docs/transformers | De facto standard library for working with transformer models |
| 148 | LangChain Documentation | https://python.langchain.com/docs/ | Most widely adopted LLM application framework -- patterns and integrations |
| 149 | OpenAI Cookbook | https://cookbook.openai.com/ | Practical recipes for common LLM application patterns |
| 150 | Anthropic Cookbook | https://github.com/anthropics/anthropic-cookbook | Claude-specific implementation patterns and best practices |
| 151 | AI Engineer Summit Resources | https://www.ai.engineer/ | Community and conference covering applied AI engineering |
| 152 | Latent Space Podcast | https://www.latent.space/ | Weekly analysis of AI engineering developments and patterns |

---

## Index by Subskill

Quick lookup for which references are most relevant to each subskill:

- **agents**: 33-48, 130-131
- **ai-security-review**: 116-129, 138-139
- **context-engineering**: 49-61
- **delegation**: 130-136, 145-146
- **evaluation**: 74-89
- **fine-tuning**: 104-115
- **llmops**: 90-103
- **mcp**: 62-73
- **orchestration**: 130-134
- **quality-gates**: 137-142
- **rag**: 14-32
- **security**: 116-129
- **skill-maintenance**: 143-146
- **verification**: 137-142
