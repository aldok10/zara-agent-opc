# RAG vs Fine-Tuning

Pairwise decision guide for choosing between Retrieval-Augmented Generation and model fine-tuning.

## When to Choose RAG

- Knowledge changes frequently (docs, policies, products)
- Need to cite sources and show provenance
- Data is proprietary and cannot be baked into model weights
- Budget is limited (no GPU training cost)
- Need to work with existing model without modification
- Factual accuracy and grounding are primary concern
- Multiple knowledge domains, each updated independently

## When to Choose Fine-Tuning

- Need to change model behavior/style/tone consistently
- Domain-specific language or terminology (medical, legal)
- Latency-critical: can't afford retrieval step
- Task is well-defined with consistent input/output format
- Training data is stable (not frequently updated)
- Need model to "internalize" patterns, not just reference them
- Reducing prompt size (encode knowledge into weights instead)

## Key Differentiators

| Dimension | RAG | Fine-Tuning |
|-----------|-----|-------------|
| Knowledge freshness | Real-time (update docs) | Stale (retrain needed) |
| Cost | Retrieval infra + embeddings | GPU hours + data curation |
| Latency | Higher (+retrieval step) | Lower (no retrieval) |
| Accuracy on facts | High (grounded in source) | Risk hallucination |
| Behavior change | Limited (prompting only) | Deep (weight modification) |
| Transparency | High (can show sources) | Low (black box) |
| Maintenance | Update docs | Retrain periodically |
| Data needed | Existing docs | Curated training pairs |

## Hybrid Approach

Best production systems combine both:
1. Fine-tune for tone/style/format (LoRA, cheap)
2. RAG for factual grounding (retrieval pipeline)

Example: customer support bot = fine-tuned for brand voice + RAG for product knowledge.

## Common Mistakes

- Fine-tuning to teach facts (they hallucinate; use RAG)
- RAG for style/behavior change (retrieval doesn't change how model writes)
- Fine-tuning on small dataset without eval (overfitting)
- RAG without reranking (garbage context = garbage output)
- Choosing based on hype, not measuring both approaches

## Decision Rule

Default to RAG. Fine-tune only when: (1) behavior/style change needed that prompting can't achieve, (2) latency budget too tight for retrieval, or (3) knowledge is static and well-curated. Always measure both if unsure.
