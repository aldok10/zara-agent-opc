# Fine-Tuning

Technical reference for parameter-efficient fine-tuning, alignment methods, data preparation, and decision frameworks.

---

## When to Fine-Tune vs RAG vs Prompting

| Approach | Best For | Cost | Latency |
|---|---|---|---|
| Prompting | Format control, simple tasks | Low | Low |
| RAG | Knowledge grounding, dynamic data | Medium | Medium |
| Fine-tuning | Style/behavior change, domain adaptation | High | Low (inference) |
| Fine-tune + RAG | Domain expert with current knowledge | Highest | Medium |

Decision: try prompting first. If few-shot examples exceed 40% of context, fine-tune. If knowledge changes weekly, use RAG. If both style AND knowledge matter, combine.

---

## LoRA (Low-Rank Adaptation)

Freezes pretrained weights, injects trainable rank-decomposition matrices into attention layers.

Key insight: weight updates during fine-tuning have low intrinsic rank. Decompose weight delta as `W = BA` where B is (d x r) and A is (r x k), with r << min(d, k).

```python
from peft import LoraConfig, get_peft_model, TaskType

config = LoraConfig(
    task_type=TaskType.CAUSAL_LM,
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,
    target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
    bias="none",
)

model = get_peft_model(base_model, config)
model.print_trainable_parameters()
# trainable: 0.1% of total parameters
```

Parameter choices:
- `r`: rank (4-64). Higher = more capacity, more VRAM. Start at 16.
- `lora_alpha`: scaling factor. Common: alpha = 2*r.
- `target_modules`: which layers get adapters. All attention projections is standard.
- `lora_dropout`: regularization. 0.05-0.1 for small datasets.

---

## QLoRA (Quantized LoRA)

Combines 4-bit quantization of base model with LoRA adapters trained in fp16/bf16.

```python
from transformers import BitsAndBytesConfig
import torch

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,
)

model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-3.1-8B",
    quantization_config=bnb_config,
    device_map="auto",
)

model = get_peft_model(model, lora_config)
```

QLoRA enables fine-tuning 70B models on a single 48GB GPU. NF4 (Normal Float 4) is information-theoretically optimal for normally distributed weights.

---

## Alignment Methods

### RLHF (Reinforcement Learning from Human Feedback)

Pipeline: SFT -> Reward Model Training -> PPO optimization.

1. **SFT**: fine-tune on high-quality demonstrations
2. **Reward Model**: train on human preference pairs (chosen vs rejected)
3. **PPO**: optimize policy against reward model with KL penalty

Downsides: reward model training is expensive, reward hacking, mode collapse.

### DPO (Direct Preference Optimization)

Skips the reward model. Directly optimizes the policy from preference pairs using a closed-form loss.

```python
# DPO loss (simplified)
# pi_ref = reference policy (SFT model)
# pi_theta = policy being trained
# (x, y_w, y_l) = prompt, winning response, losing response

log_ratio_w = log_prob(pi_theta, y_w|x) - log_prob(pi_ref, y_w|x)
log_ratio_l = log_prob(pi_theta, y_l|x) - log_prob(pi_ref, y_l|x)

loss = -log(sigmoid(beta * (log_ratio_w - log_ratio_l)))
```

`beta` controls deviation from reference policy. Lower beta = more exploration. Typical: 0.1-0.5.

### ORPO (Odds Ratio Preference Optimization)

Combines SFT and alignment in one step. No reference model needed.

```python
# ORPO adds a preference loss term to the standard SFT loss
loss = loss_sft + lambda * loss_odds_ratio
# odds_ratio = P(y_w|x)/(1-P(y_w|x)) / (P(y_l|x)/(1-P(y_l|x)))
```

Simpler pipeline, lower compute. Works well when preference signal is clear.

---

## Data Preparation

### Instruction Tuning Format

```json
{
  "instruction": "Summarize the following article in 3 bullet points.",
  "input": "The Federal Reserve announced...",
  "output": "- Fed held rates steady at 5.25-5.5%\n- Inflation trending down but above target\n- Next meeting in 6 weeks, market expects cut"
}
```

### Quality Filtering Pipeline

1. **Deduplication**: MinHash or exact-match dedup on instruction field
2. **Length filtering**: remove too-short (<10 tokens) or too-long outputs
3. **Format validation**: ensure output matches expected structure
4. **Toxicity filtering**: run through safety classifier
5. **Difficulty scoring**: IFD (Instruction Following Difficulty) to remove trivial pairs
6. **Diversity sampling**: cluster by embedding, sample uniformly across clusters

Dataset size guidelines:
- Style/format changes: 500-2000 examples
- Domain adaptation: 5000-50000 examples
- New capability: 10000-100000+ examples

---

## Evaluation of Fine-Tuned Models

| Metric | What It Measures | Tool |
|---|---|---|
| Loss curves | Overfitting detection | Training logs |
| Perplexity | Language modeling quality | eval split |
| Task-specific metrics | Actual performance | Custom eval suite |
| Human preference | Subjective quality | Side-by-side comparison |
| Contamination check | Data leakage | Membership inference |

Red flags during training:
- Train loss drops, eval loss rises = overfitting (reduce epochs, increase data)
- Loss oscillates wildly = learning rate too high
- Loss plateaus immediately = learning rate too low or rank too low

---

## Training Configuration Example

```python
from transformers import TrainingArguments
from trl import SFTTrainer

training_args = TrainingArguments(
    output_dir="./output",
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    lr_scheduler_type="cosine",
    warmup_ratio=0.03,
    bf16=True,
    logging_steps=10,
    eval_strategy="steps",
    eval_steps=100,
    save_strategy="steps",
    save_steps=100,
    max_grad_norm=0.3,
    group_by_length=True,
)

trainer = SFTTrainer(
    model=model,
    args=training_args,
    train_dataset=train_data,
    eval_dataset=eval_data,
    max_seq_length=2048,
    packing=True,
)
```

Key hyperparameters: low learning rate (1e-5 to 2e-4), short warmup, cosine schedule, gradient clipping at 0.3-1.0. Packing fills context windows efficiently.
