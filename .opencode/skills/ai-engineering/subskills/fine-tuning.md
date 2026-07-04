# Fine-tuning vs RAG: Decision & Techniques

## Decision framework — RAG first
Fine-tune ONLY when:
- You need a specific output format/style **consistently**
- Domain vocabulary is absent from the base model
- Latency budget is too tight for a RAG retrieval step
- RAG has been **evaluated and measurably shown insufficient** (measured, not assumed)

## RAG advantages
- No training cost
- Instant knowledge updates
- Explainable (show sources)
- No catastrophic forgetting

## Fine-tune advantages
- Consistent style/format
- Lower inference latency (no retrieval hop)
- Smaller context needed per call
- Domain-specific reasoning baked in

## Techniques (2026)
- **LoRA / QLoRA**: parameter-efficient (trains 1-5% of params), runs on consumer GPUs. Standard for most fine-tuning.
- **Full fine-tune**: only for fundamental behavior change. Expensive, usually unnecessary.
- **DPO (Direct Preference Optimization)**: simpler than RLHF, great for style/preference alignment.
- **RLHF**: most powerful but complex (reward model + policy training). Overkill for most use cases.

## Dataset requirements
- Minimum **1,000** high-quality examples for LoRA
- **10K+** for significant behavior change
- **Data quality > quantity**: 500 perfect examples beat 10K noisy ones

## Evaluation
- **Always** eval before AND after fine-tuning on a held-out test set
- Measure regression on **general** capabilities, not just the target task

## Catastrophic forgetting
Fine-tuning can degrade general ability. Mitigate by mixing general data into training and evaluating on general benchmarks.

## Practical workflow
collect examples -> clean & deduplicate -> format (instruction/input/output) -> train LoRA -> eval -> iterate

## Anti-patterns
- Fine-tuning before trying RAG
- Training on small/noisy data
- No held-out eval set
- Fine-tuning for **knowledge** (use RAG instead)
- Ignoring catastrophic forgetting
