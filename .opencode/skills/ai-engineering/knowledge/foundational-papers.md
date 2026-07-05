# Foundational Papers

Key papers that shaped modern LLM engineering. Focus on practitioner insights, not just academic contribution.

---

## Attention Is All You Need (Vaswani et al., 2017)

Introduced the Transformer architecture. Replaced recurrence with self-attention.

### Core Mechanism: Scaled Dot-Product Attention

```
Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) V
```

Multi-head attention runs multiple attention functions in parallel, each with different learned projections:

```python
def multi_head_attention(Q, K, V, num_heads, d_model):
    d_k = d_model // num_heads
    heads = []
    for i in range(num_heads):
        Q_i = Q @ W_q[i]  # (seq_len, d_k)
        K_i = K @ W_k[i]
        V_i = V @ W_v[i]
        scores = (Q_i @ K_i.T) / (d_k ** 0.5)
        attn = softmax(scores) @ V_i
        heads.append(attn)
    return concat(heads) @ W_o
```

### Practitioner Insights

- Positional encoding is necessary because attention is permutation-invariant
- Encoder-decoder for seq2seq, decoder-only for generation (GPT chose decoder-only)
- Parallelizable across sequence length (unlike RNNs) -- key to scaling
- Attention complexity is O(n^2) in sequence length -- motivates efficient attention research

---

## BERT (Devlin et al., 2018)

Bidirectional encoder pre-training. Masked Language Modeling (MLM) + Next Sentence Prediction.

### Why It Matters for Practitioners

- Proved that pre-training on unlabeled text transfers to downstream tasks
- Encoder-only: good for classification, NER, retrieval (not generation)
- Still the basis for embedding models used in RAG (e.g., sentence-transformers)
- Fine-tuning a pre-trained model is vastly more efficient than training from scratch

Modern descendants: RoBERTa (no NSP, more data), DeBERTa (disentangled attention), E5/BGE (retrieval-optimized).

---

## GPT Series Evolution

### GPT-1 (Radford et al., 2018)

Decoder-only transformer + unsupervised pre-training + supervised fine-tuning. Showed that generative pre-training helps downstream tasks.

### GPT-2 (Radford et al., 2019)

Scaled up (1.5B params). Zero-shot task performance without fine-tuning. Key insight: language models are unsupervised multitask learners.

### GPT-3 (Brown et al., 2020)

175B parameters. In-context learning: task performance from examples in the prompt, no gradient updates.

```
Translate English to French:
sea otter => loutre de mer
cheese => fromage
hello =>
```

### Practitioner Insights

- Scale unlocks emergent abilities (in-context learning appeared at ~10B+ params)
- Few-shot prompting is a form of task specification, not training
- Prompt engineering matters because the model "follows the distribution" of its context
- API-based access changed the economics: fine-tuning vs prompting vs RAG trade-offs

---

## Scaling Laws (Kaplan et al., 2020; Hoffmann et al. "Chinchilla", 2022)

### Kaplan Scaling Laws

Performance (loss) follows power laws with respect to:
- Model size (parameters N)
- Dataset size (tokens D)
- Compute budget (FLOPs C)

```
L(N) ~ N^(-0.076)  (loss decreases as power law of params)
L(D) ~ D^(-0.095)  (loss decreases as power law of data)
```

Implication: given a fixed compute budget, you can predict optimal model size vs training tokens.

### Chinchilla (Hoffmann et al., 2022)

Kaplan overfit to large models trained on insufficient data. Chinchilla showed:

```
Optimal: tokens ~ 20x parameters
```

A 70B model should train on ~1.4T tokens. Previous models (like GPT-3 at 175B, 300B tokens) were undertrained.

### Practitioner Insights

- Don't just scale parameters -- scale data proportionally
- Smaller well-trained models often beat larger undertrained models
- This motivated Llama (7B-70B trained on 1-2T tokens) and Mistral's approach
- Inference cost scales with parameters, so Chinchilla-optimal saves at serving time
- Diminishing returns: 10x compute ~ 0.5-1.0 loss reduction

---

## InstructGPT and RLHF (Ouyang et al., 2022)

Aligned GPT-3 to follow instructions using human feedback.

### Three-Stage Pipeline

1. **Supervised Fine-Tuning (SFT)**: train on human-written demonstrations
2. **Reward Modeling (RM)**: train a reward model on human preference comparisons
3. **PPO**: optimize the policy against the reward model with a KL penalty against SFT

```
objective = E[R(x, y)] - beta * KL(pi || pi_sft)
```

### Practitioner Insights

- Small aligned model (1.3B InstructGPT) preferred over large unaligned model (175B GPT-3)
- Alignment is a separate axis from capability -- you need both
- RLHF is expensive and unstable -- motivated DPO, ORPO, KTO alternatives
- "Alignment tax" is real but small: slight capability loss for large helpfulness gain
- The human preference data is the bottleneck, not the algorithm

---

## RAG: Retrieval-Augmented Generation (Lewis et al., 2020)

Combines parametric memory (LLM weights) with non-parametric memory (retrieval index).

### Architecture

```
Query -> Retriever (DPR/embedding search) -> Top-K documents
Query + Documents -> Generator (seq2seq LLM) -> Answer
```

### Original Design (DPR + BART)

- Dual-encoder retriever: encode query and documents separately, find nearest neighbors
- Generator conditions on concatenation of query and retrieved passages
- End-to-end training: retriever and generator trained jointly (marginalize over documents)

### Practitioner Insights

- Retrieval grounds generation in real documents -- reduces hallucination
- Non-parametric memory can be updated without retraining (swap index, not model)
- Chunking strategy matters more than embedding model choice in practice
- Modern RAG uses dense retrieval (embeddings) + reranking (cross-encoder)
- Failure modes: irrelevant retrieval, context window overflow, conflicting sources
- RAG works best when the answer exists verbatim or nearly verbatim in the corpus

### Modern RAG Stack

```
Query -> Query rewriting -> Hybrid search (dense + sparse)
     -> Reranking (cross-encoder) -> Context assembly
     -> LLM generation with citations -> Output validation
```

---

## Key Takeaways Across Papers

| Paper | Core Insight for Practitioners |
|---|---|
| Transformers | Parallelism enables scale; attention is the compute bottleneck |
| BERT | Pre-train once, fine-tune cheaply; embeddings power retrieval |
| GPT series | Scale + in-context learning; prompting as task specification |
| Scaling laws | Budget allocation matters; Chinchilla-optimal saves inference cost |
| InstructGPT | Alignment is cheap relative to pre-training; human data is the bottleneck |
| RAG | Ground in documents for factuality; index updates are cheaper than retraining |
