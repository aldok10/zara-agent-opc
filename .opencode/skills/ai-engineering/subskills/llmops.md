---
type: subskill
title: "LLMOps & Production Deployment"
---

# LLMOps & Production Deployment

## Model routing
Cheap model for simple tasks (GPT-4o-mini, Claude Haiku), expensive for complex (Opus, GPT-5.x). Route by task complexity, input length, and required quality.

## Cost management
- Track tokens per request
- Set per-user / per-request budgets
- Cache common responses; batch where possible
- Typical API cost: **$0.01-$0.10** per complex request

## Latency optimization
- **Streaming** (cuts perceived latency)
- **Prompt caching** (reuse common prefixes)
- **Model cascading** (fast first, escalate on low confidence)
- Parallel tool calls
- Edge deployment for inference

## A/B testing
Split traffic between model versions; measure quality + cost + latency. Reach statistical significance before switching.

## Canary deployment
New version -> 1% traffic -> monitor quality -> expand. Roll back on quality drop.

## Observability (MANDATORY)
Trace every LLM call with: `model_id`, `prompt_hash` (NOT full prompt  --  PII), `input_tokens`, `output_tokens`, `latency_ms`, `cost_usd`, `quality_score` (if eval'd).
- Tools: **LangSmith**, **Langfuse** (open-source), **Phoenix** (Arize), **Helicone**, custom OTel spans.

## Caching
- **Semantic cache**: similar prompts -> cached response
- **Exact cache**: identical input -> identical output
- Saves **30-60%** on repeated queries

## Rate limiting
Per-user, per-API-key, per-model. Degrade gracefully to a cheaper model when limited.

## Fallback chain
primary model -> secondary model -> cached response -> deterministic fallback. **Never** show a raw error if a degraded response is possible.

## Guardrails in production
- Input: PII redaction, injection detection
- Output: content policy, format validation
- Cost: max tokens, budget caps

## Versioning
Version prompts, model configs, and eval datasets. Reproduce any point in time.

## Anti-patterns
- No cost tracking (bill shock)
- No caching (paying repeatedly for the same answer)
- No fallback (one model down = whole service down)
- Logging full prompts with PII
