---
name: ai-engineering
description: "AI engineering: build AI systems (RAG, agents, evals) AND work with AI (delegation, verification)"
---

# AI Engineering

Two sides of the same craft in the 2026 stack:

- **Building AI systems**: RAG pipelines, AI agents, context engineering, LLM evaluation, LLMOps, MCP servers. RAG-first, eval-driven, cost-aware. Context window is RAM.
- **Working WITH AI**: delegation strategy, verification of AI output, trust calibration, quality gates. The job shifted from writing code to orchestrating agents and verifying output. Trust but verify -- every AI output is a draft until validated.

Default answer is "it depends", then explain tradeoffs for THIS system: freshness, cost, latency, accuracy, risk.

## Scope

- HANDLES (build): RAG, agents, context engineering, evals, LLMOps, fine-tune-vs-RAG, MCP design.
- HANDLES (use): AI delegation, prompt decomposition, verification of generated code, trust calibration, quality gates, anti-patterns (vibe-coding debt, skill atrophy, false confidence).
- DEFERS: Go impl to `golang-expert`; Python impl to `python-expert`; system architecture to @atlas; security review to @shield. Domain topics to subskills below.

## First Action

1. Classify the work: BUILDING an AI system, or USING AI to build?
2. If building: identify workload class (retrieval, agentic, generative, evaluative). Establish eval baseline BEFORE changing anything.
3. If using: classify task shape -- routine (delegate fully) | ambiguous (collaborate) | novel/irreversible (human-led, AI assists).
4. Read `PROJECT.md` in this skill dir if present. Project rules override generic advice.

## Constraints

Building AI systems:
1. RAG first: fine-tune only when RAG demonstrably fails (measured, not assumed).
2. Evaluate before shipping: every LLM feature needs an eval suite. No suite = not done.
3. Context window is RAM: budget and measure tokens per request.
4. Hybrid search (semantic + keyword) as the default retrieval strategy.
5. Guard prompt injection at every boundary (retrieved docs, tool results, user input).
6. Cost-aware: track tokens/request, set budgets, route models (cheap default, escalate on need).
7. Agent loops need exit conditions: max iterations, cost ceiling, timeout. All three.
8. Observability: trace every LLM call (model, prompt hash, tokens, latency, cost).

Working with AI:
9. Decompose before delegating: atomic, verifiable units. AI fails at ambiguous mega-tasks.
10. Verify at boundaries, not every line: check inputs, outputs, contracts, edge cases -- test it.
11. Trust calibration: routine CRUD = high trust; auth/payments/PII = zero trust.
12. Own the architecture: AI proposes implementations, YOU own irreversible design decisions.
13. Spec first, code second: clear acceptance criteria BEFORE prompting. Garbage in = garbage out.
14. Iterate over one-shot: first output is a draft. Struggling after 2-3 iterations = bad decomposition or missing context, not the model. Re-frame.
15. Structured output / JSON mode as standard practice for LLM responses that feed downstream systems.
16. A2A (Agent-to-Agent) protocol for multi-agent interop -- standardizes agent discovery, task delegation, and status reporting across heterogeneous agent systems.

**Design standard**: Context Engineering over prompt tuning. The 5 layers (system prompt, retrieved context, conversation history, tool results, user input) are dynamically selected, compressed, and budgeted per request. Load `subskills/context-engineering.md`.

## DO NOT

- NEVER ship without an eval suite (minimum 100 test cases for production).
- NEVER use RAG without measuring retrieval relevance (precision@k, recall@k).
- NEVER build agents without exit conditions (infinite loops = $$$$).
- NEVER use a single retrieval strategy (always hybrid).
- NEVER deploy a new model version without regression eval.
- NEVER store raw prompts with PII in logs; NEVER hardcode model names.
- NEVER ship AI-generated code you cannot explain to a teammate.
- NEVER let AI make irreversible architectural or business decisions unsupervised.
- NEVER trust AI output for security-critical paths without automated verification (SAST).
- NEVER skip tests or code review because "AI wrote it" (AI PRs need MORE scrutiny).
- NEVER assume AI output is correct because it looks confident (hallucination is the default).
- NEVER stop practicing fundamentals -- if you can't review it, you can't delegate it.

## Route to Subskill

| Signal | Load |
|--------|------|
| retrieval, embedding, vector, chunk, search, index | `subskills/rag.md` |
| agent, tool, loop, plan, react, multi-agent (building) | `subskills/agents.md` |
| eval, judge, score, metric, regression, benchmark | `subskills/evaluation.md` |
| context, prompt, window, memory, compress | `subskills/context-engineering.md` |
| deploy, monitor, cost, route, scale, latency, ops | `subskills/llmops.md` |
| fine-tune, train, LoRA, dataset, RLHF | `subskills/fine-tuning.md` |
| MCP, tool-server, protocol, resource | `subskills/mcp.md` |
| injection, guardrail, filter, redact (in AI system) | `subskills/security.md` |
| delegate, decompose, prompt-as-spec, framing, context-packaging | `subskills/delegation.md` |
| review, verify, trust, approve, merge AI output | `subskills/verification.md` |
| orchestrate, coordinate, parallel agents, workstream | `subskills/orchestration.md` |
| atrophy, practice, learning, fundamentals | `subskills/skill-maintenance.md` |
| security review, SAST, scan AI-generated code | `subskills/ai-security-review.md` |
| vibe debt, quality gate, maintainability, coverage, mutation | `subskills/quality-gates.md` |

Multiple OK. Load only what's needed.

## Verification

- Eval suite passes with score > threshold; cost per request within budget; latency p95 < target.
- No prompt injection vulnerabilities in boundary tests.
- AI-generated code passes all tests + new edge-case tests; security scan clean; developer can explain every non-trivial decision.

## Related Skills

| When | Load |
|------|------|
| Go / Python implementation | `golang-expert` / `python-expert` |
| System architecture | dispatch @atlas |
| Security review | dispatch @shield |
| Code review depth | `code-review` |
| Testing strategy | `tdd` |

## Knowledge (load on demand via `knowledge_read`)

- `ai-engineering/knowledge/common-mistakes.md` - LLM/RAG/agent production pitfalls

## AI-Era Context

- Frontier model context windows (200K+ tokens) change RAG strategy: stuff more, chunk less
- Structured output (JSON mode, tool_use) is default for all agent-to-agent communication
