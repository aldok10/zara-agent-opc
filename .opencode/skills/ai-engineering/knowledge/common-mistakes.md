---
type: fact
title: "AI/LLM Engineering Common Mistakes - Production Lessons"
---

# AI/LLM Engineering Common Mistakes

38 production-tested failure modes organized by category. Each entry: what goes wrong, the impact, and the proven fix.

## Prompt Engineering

| Mistake | Impact | Fix |
|---------|--------|-----|
| Few-shot pollution (examples contradict instructions) | Model follows stale examples, 15+ point drift | Version examples with instructions, audit on change |
| Instruction stacking without consolidation | Past 8-10 rules, model triages which to follow | Compress into principles + examples; refactor, don't append |
| Format-via-example without explicit schema | Fragments on 20% of dissimilar traffic | Explicit schema + structured output mode |
| Persona stuffing on technical tasks | Stylistic theatre degrades factual precision | Only use persona for style tasks; A/B test persona-free |
| Ungrounded chain-of-thought | Model invents plausible but hallucinated reasoning | Anchor CoT in retrieved context |
| Prompt-response coupling (parser depends on specific phrasing) | Model upgrade shifts phrasing, parser breaks | Parse schema-validated fields only |
| Eval-blind iteration (hand-tuning without measurement) | Each edit regresses other cases silently | Eval suite per prompt, regression alerts |

## RAG / Retrieval

| Mistake | Impact | Fix |
|---------|--------|-----|
| Wrong chunk size (too large or too small) | Retrieval returns irrelevant passages | Semantic chunking; test with recall@k |
| Embedding model mismatch/drift | Queries stop returning relevant results | Pin version, re-encode on upgrade, monitor similarity |
| Stale index (not rebuilding after data changes) | Model recommends outdated info | Automate reindexing tied to source updates |
| No hybrid search (vector-only) | Misses exact-match cases | Combine BM25 + vector search |
| No reranking after retrieval | Top-k contains noise that dilutes generation | Cross-encoder reranker |
| Ignoring context order in prompt | Wrong chunk first = wrong answer | Rank by relevance, most relevant closest to question |
| No confidence threshold on retrieval | Low-similarity triggers hallucination | Score threshold, return "not confident" when below |

## Agent Architecture

| Mistake | Impact | Fix |
|---------|--------|-----|
| God agent (single agent for everything) | Hallucination scales non-linearly with complexity | Orchestrator + specialized sub-agents |
| No memory strategy (stateless between turns) | Users re-state context; sessions truncate | Three-tier: in-context, semantic, episodic |
| Missing tool-call guardrails | Unvalidated args; unauthorized actions | Schema validation + action classification + role-scoped |
| Unbounded agent loops | Thousands in tokens from one bad tool response | Hard recursion_limit, token budget, spend alerts |
| No human escalation path | Irreversible actions without confirmation | Route low-confidence/high-stakes to human |
| Compounding error across steps (85% per step = 20% on 10 steps) | End-to-end success far lower than component | Verify intermediates, add checkpoints |

## Evaluation

| Mistake | Impact | Fix |
|---------|--------|-----|
| Proxy metrics that don't predict production failure | Summaries contradictory while BLEU stays 0.74 | LLM-as-judge with business-specific rubric |
| No eval before shipping (vibes-only) | Regressions discovered by customers | Golden dataset 50-100 inputs; block deploy on regression |
| Evaluating components without end-to-end measurement | Optimizing one part while experience stays broken | Measure task completion first |
| LLM-as-judge bias (position, verbosity, self-enhancement) | Systematically misleading scores | Randomize position, control length, multiple judges |
| Static failure modes never updated | New failures not caught by existing evals | Periodically update failure ontology |

## Production Operations

| Mistake | Impact | Fix |
|---------|--------|-----|
| No observability (can't trace what agent did) | Debugging takes days | Trace ID per session, span per tool call |
| Model-version drift (prompt breaks on provider update) | 1 in 10 prompts regress silently | Eval suite per model version, pin versions |
| Token cost explosion | Long-tail sessions cost 100x | Session token budgets, spend-rate alerts |
| Caching LLM naively (exact prompt text key) | Cache miss near 100% or stale answers | Semantic cache keying, TTL based on freshness |
| Context window overflow | Model truncates early instructions | Summarize older context, track tokens |
| No latency budgeting | Users abandon despite correct answers | p95 targets per component, parallelize |

## Security

| Mistake | Impact | Fix |
|---------|--------|-----|
| No prompt injection defense on retrieved text | Malicious content hijacks model | Sanitize, separate data from instructions |
| Sensitive data leakage through embeddings | PII exposed in responses | Anonymize before embedding, access control |

## Key Patterns Across Categories

| Pattern | Frequency | Mitigation Principle |
|---------|-----------|---------------------|
| Silent regression (change causes failure elsewhere) | 8/38 mistakes | Eval gates on every change |
| Unbounded growth (tokens, loops, cost) | 6/38 mistakes | Hard limits + alerts at every layer |
| Missing feedback signal (no way to detect failure) | 7/38 mistakes | Observability + structured scoring |
| Coupling to model specifics (phrasing, version) | 5/38 mistakes | Schema-first, version-pinned, abstraction layers |

## Decision Framework: When to Worry

- **Pre-launch**: Focus on eval coverage, prompt injection, and cost modeling
- **Post-launch (week 1-4)**: Focus on observability, latency budgets, drift detection
- **Scaling (month 2+)**: Focus on caching, chunking optimization, agent decomposition

## Sources

- Anthropic prompt engineering guide (2024-2025)
- OpenAI production best practices documentation
- LangChain/LangSmith failure mode analysis
- Pinecone RAG best practices
- Eugene Yan "Patterns for Building LLM-based Systems" (2024)
- Hamel Husain evaluation methodology writings
- Jason Liu instructor/structured output lessons
- Production incident post-mortems (compiled from public writeups)
- Simon Willison prompt injection research
- Chip Huyen "Building LLM Applications for Production"
