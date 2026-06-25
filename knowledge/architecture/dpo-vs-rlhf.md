# DPO vs RLHF (PPO)

Pairwise decision guide for LLM alignment methods.

## When to Choose DPO

- Limited compute budget (no reward model training, no PPO loop)
- Simple preference data available (chosen vs rejected pairs)
- Stability matters more than peak performance
- Small team without RL expertise
- Quick iteration cycle needed
- Task is well-represented by binary preference comparisons

## When to Choose RLHF (PPO)

- Pushing for maximum quality ceiling (especially code, math)
- Complex reward signals that can't reduce to pairwise preference
- Team has RL engineering expertise
- Compute budget is available (2-3x training cost of DPO)
- Need fine-grained control over reward shaping
- Multi-objective optimization (helpful AND harmless AND honest)

## Key Differentiators

| Dimension | DPO | RLHF (PPO) |
|-----------|-----|-------------|
| Compute | 1x (single training pass) | 3-4x (reward model + PPO loop + value head) |
| Complexity | Low (supervised-like) | High (RL infra, hyperparameter sensitive) |
| Quality ceiling | Good | Higher (especially on hard tasks) |
| Stability | High | Requires careful tuning (reward hacking risk) |
| Data requirement | Preference pairs | Preference pairs + online generation |
| Reward model | Not needed | Required (separate training) |
| Online generation | Not needed | Required (PPO samples from policy) |
| Reward hacking | Impossible (no explicit reward) | Possible (model games reward model) |

## Newer Alternatives (2025-2026)

| Method | Key Idea | Tradeoff |
|--------|----------|----------|
| **GRPO** (DeepSeek) | Group Relative Policy Optimization. No value model, no reward model. Uses group scores from sampled responses. | Best for reasoning tasks. Less general. |
| **RLAIF** | Replace human preferences with AI-generated preferences | Cheaper data, risk of model echo chamber |
| **KTO** | Kahneman-Tversky Optimization. Only needs thumbs-up/down, not pairs | Simpler data collection, slightly lower quality |
| **ORPO** | Odds Ratio Preference. Combines SFT + alignment in one step | Simplest but less flexible |

## Common Mistakes

- DPO on noisy preference data (garbage in, garbage out)
- PPO without reward model evaluation (reward hacking undetected)
- Fine-tuning alignment on top of a weak base model (alignment can't fix capability gaps)
- Using alignment to teach knowledge (that's fine-tuning or RAG's job)

## Decision Rule

Start with DPO (simplicity, speed, stability). Move to PPO/GRPO only when: (1) DPO quality plateaus and ceiling matters, (2) team has RL expertise, or (3) multi-objective rewards need explicit optimization. For reasoning-heavy tasks, consider GRPO directly.
