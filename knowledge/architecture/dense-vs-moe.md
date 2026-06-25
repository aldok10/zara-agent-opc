# Dense Model vs MoE (Mixture of Experts)

Pairwise decision guide for model architecture scaling decisions.

## When to Choose Dense

- Inference latency is primary constraint (predictable compute per token)
- Memory budget limited (all params active = total params stored)
- Simple deployment (no routing overhead)
- Small model size (< 13B params, MoE overhead not worth it)
- Training stability matters more than scaling efficiency
- Single-GPU deployment required

## When to Choose MoE

- Need large model capacity at lower compute cost
- Serving many concurrent requests (batch efficiently)
- Training compute budget allows exploring larger capacity
- Multi-domain expertise needed (different experts specialize)
- Willing to trade memory for compute savings
- Have multi-GPU infrastructure (experts distribute across GPUs)

## Key Differentiators

| Dimension | Dense | MoE |
|-----------|-------|-----|
| Params active per token | All | Top-K experts only (typically 2) |
| Total params stored | = active params | 4-8x active params |
| Compute per token | Fixed (all params) | Fixed (only K experts) |
| Memory requirement | Total params | Total params (higher!) |
| Quality per FLOP | Baseline | Better (more capacity, same compute) |
| Training stability | Simpler | Load balancing challenges |
| Inference latency | Predictable | Router adds small overhead |
| Expert specialization | N/A | Emerges naturally |

## Real-World Examples

| Model | Type | Total Params | Active Params | Architecture |
|-------|------|-------------|---------------|--------------|
| LLaMA 3.1 70B | Dense | 70B | 70B | All active |
| Mixtral 8x7B | MoE | 47B | 13B | 8 experts, top-2 |
| DeepSeek-V3 | MoE | 671B | 37B | 256 experts, top-8 |
| GPT-4 (rumored) | MoE | ~1.8T | ~280B | 16 experts |

## Common Mistakes

- MoE for small models (routing overhead exceeds capacity gain)
- Not accounting for total memory (MoE stores ALL expert weights)
- Ignoring load balancing (tokens collapse to few experts without auxiliary loss)
- Expecting linear scaling (diminishing returns beyond certain expert count)

## Decision Rule

For serving: if memory allows, MoE gives best quality-per-FLOP at scale. For constrained deployment (single GPU, edge): dense is simpler and more predictable. The industry trend is MoE for frontier models, dense for smaller specialized models.
