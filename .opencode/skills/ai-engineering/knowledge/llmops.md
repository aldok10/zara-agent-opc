# LLMOps

Deep technical reference for deploying, serving, monitoring, and operating LLM systems in production.

---

## Model Serving

### vLLM

The default open-source inference engine. Uses PagedAttention for efficient KV-cache management, continuous batching for throughput.

```bash
# Serve a model
python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Meta-Llama-3.1-8B-Instruct \
    --tensor-parallel-size 2 \
    --max-model-len 8192 \
    --gpu-memory-utilization 0.9
```

Key tuning parameters:
- `--max-num-seqs`: concurrent sequences (batch size)
- `--gpu-memory-utilization`: higher = more KV cache space
- `--quantization`: awq, gptq, fp8 for memory savings
- `--tensor-parallel-size`: split across GPUs

### Text Generation Inference (TGI)

HuggingFace's serving solution. Docker-native, supports Flash Attention, speculation decoding.

```bash
docker run --gpus all -p 8080:80 \
    ghcr.io/huggingface/text-generation-inference:latest \
    --model-id meta-llama/Meta-Llama-3.1-8B-Instruct \
    --max-input-length 4096 \
    --max-total-tokens 8192
```

### Ollama

Local model running for development. Manages model downloads, quantization, and serving behind a simple API.

```bash
ollama pull llama3.1:8b
ollama serve
# API at http://localhost:11434/v1/chat/completions (OpenAI-compatible)
```

### Cloud Endpoints

For production without GPU management: OpenAI, Anthropic, Google, or proxy services like OpenRouter and LiteLLM that provide unified APIs across providers with fallback.

---

## Caching Strategies

### Exact Match Cache

Cache by hash of (model + messages + parameters). Hit rate is low but implementation is trivial.

### Semantic Cache

Embed the query, check vector similarity against cached queries. If similarity > threshold, return cached response.

```python
import hashlib
import numpy as np

class SemanticCache:
    def __init__(self, embedder, threshold=0.95):
        self.embedder = embedder
        self.threshold = threshold
        self.cache = {}  # embedding -> response
        self.embeddings = []

    def get(self, query: str):
        query_emb = self.embedder.encode(query)
        if not self.embeddings:
            return None

        sims = np.dot(self.embeddings, query_emb)
        max_idx = np.argmax(sims)
        if sims[max_idx] >= self.threshold:
            return list(self.cache.values())[max_idx]
        return None

    def set(self, query: str, response: str):
        emb = self.embedder.encode(query)
        self.embeddings.append(emb)
        self.cache[hashlib.md5(query.encode()).hexdigest()] = response
```

### Prompt Caching (Provider-level)

Anthropic and OpenAI support caching static prompt prefixes server-side. Reduces latency and cost for repeated system prompts.

```python
# Anthropic prompt caching
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    system=[{
        "type": "text",
        "text": large_system_prompt,
        "cache_control": {"type": "ephemeral"}
    }],
    messages=[{"role": "user", "content": query}]
)
```

---

## Cost Optimization

### Model Routing

Route simple queries to cheap/fast models, complex queries to capable/expensive models.

```python
class ModelRouter:
    def __init__(self):
        self.classifier = load_complexity_classifier()

    def route(self, query: str) -> str:
        complexity = self.classifier.predict(query)
        if complexity == "simple":
            return "gpt-4o-mini"  # $0.15/1M input
        elif complexity == "medium":
            return "gpt-4o"       # $2.50/1M input
        else:
            return "o1"           # $15/1M input

    def with_fallback(self, query: str, messages: list) -> str:
        model = self.route(query)
        try:
            return call_llm(model, messages)
        except (RateLimitError, TimeoutError):
            return call_llm(self.fallback_model, messages)
```

### Token Budgeting

Set per-request token limits. Truncate context to fit budget. Track spending per user/feature.

### Batch Processing

Use batch APIs (OpenAI Batch API: 50% discount) for non-real-time workloads: evals, data processing, content generation.

```python
# OpenAI Batch API
batch_input = [
    {"custom_id": f"req_{i}", "method": "POST", "url": "/v1/chat/completions",
     "body": {"model": "gpt-4o-mini", "messages": msgs}}
    for i, msgs in enumerate(all_requests)
]

# Submit batch (results in 24h, 50% cheaper)
batch = client.batches.create(input_file_id=file_id, endpoint="/v1/chat/completions")
```

---

## Monitoring

### Key Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Latency p50 | <1s | >2s |
| Latency p95 | <3s | >5s |
| Latency p99 | <8s | >15s |
| Error rate | <0.1% | >1% |
| Token usage/request (avg) | Track trend | >2x baseline |
| Quality score (sampled) | >0.85 | <0.75 |
| Cost per request (avg) | Track trend | >2x baseline |

### Quality Monitoring

Sample production responses and run automated quality checks:

```python
import random

class QualityMonitor:
    def __init__(self, sample_rate=0.05):
        self.sample_rate = sample_rate

    def maybe_evaluate(self, request, response):
        if random.random() > self.sample_rate:
            return

        scores = {
            "relevance": self.judge_relevance(request, response),
            "safety": self.check_safety(response),
            "format": self.check_format(response),
        }

        self.emit_metrics(scores)
        if any(s < 0.5 for s in scores.values()):
            self.alert(request, response, scores)
```

---

## Guardrails

### Input Validation

Check incoming requests before they reach the model:

```python
class InputGuardrail:
    def check(self, messages: list[dict]) -> tuple[bool, str]:
        user_content = extract_user_content(messages)

        if self.detect_injection(user_content):
            return False, "Potential prompt injection detected"

        if self.detect_pii(user_content):
            return False, "PII detected in input"

        if len(user_content) > self.max_input_length:
            return False, "Input too long"

        return True, "OK"
```

### Output Validation

Check model responses before returning to users:

- PII detection (regex + NER model)
- Topic restriction (classifier for off-topic responses)
- Toxicity scoring
- Format validation (JSON schema compliance)
- Factual consistency (compare against source documents for RAG)

### NeMo Guardrails / Guardrails AI

Framework-level solutions that wrap your LLM calls with programmable safety checks:

```python
from guardrails import Guard
from guardrails.hub import ToxicLanguage, DetectPII

guard = Guard().use_many(
    ToxicLanguage(threshold=0.8, on_fail="fix"),
    DetectPII(pii_entities=["EMAIL", "PHONE"], on_fail="anonymize"),
)

result = guard(
    llm_api=openai.chat.completions.create,
    model="gpt-4o",
    messages=messages
)
```

---

## Observability

### Tracing LLM Calls

Track the full lifecycle of each request through your system:

```python
# Langfuse integration
from langfuse import Langfuse
from langfuse.decorators import observe

langfuse = Langfuse()

@observe(as_type="generation")
def call_llm(messages, model="gpt-4o"):
    response = client.chat.completions.create(model=model, messages=messages)
    return response.choices[0].message.content

@observe()
def rag_pipeline(query):
    docs = retrieve(query)          # traced as span
    context = format_docs(docs)     # traced as span
    answer = call_llm(build_messages(query, context))  # traced as generation
    return answer
```

### Key Observability Tools

| Tool | Strength | Model |
|------|----------|-------|
| Langfuse | Open-source, self-hostable, full tracing | Free tier + self-host |
| Helicone | Proxy-based (zero code changes), cost tracking | Proxy model |
| Arize Phoenix | Trace visualization, embedding analysis | Open-source |
| Braintrust | Eval + observability combined | Platform |
| Langsmith | Deep LangChain integration | Platform |

---

## Deployment Patterns

### Blue-Green for Model Updates

Run two versions simultaneously. Route traffic gradually to new model. Rollback instantly if quality drops.

### Canary Deployment

Send 5-10% of traffic to new model/prompt. Monitor quality metrics. Expand if metrics hold.

```python
class CanaryRouter:
    def __init__(self, canary_pct=0.05):
        self.canary_pct = canary_pct
        self.primary = "gpt-4o-2024-08-06"
        self.canary = "gpt-4o-2024-11-20"

    def get_model(self, request_id: str) -> str:
        if hash(request_id) % 100 < self.canary_pct * 100:
            return self.canary
        return self.primary
```

### Shadow Mode

Run new model in parallel, log results, but serve from the existing model. Compare offline. Zero risk to users.

---

## Scaling

### Auto-scaling Signals

- Queue depth (pending requests waiting for inference)
- GPU utilization (target 70-85%)
- Latency p95 exceeding SLA
- Concurrent connections

### GPU Considerations

- Use spot/preemptible instances for batch workloads (60-80% savings)
- Right-size GPU memory to model size (don't waste A100 on a 7B model)
- Tensor parallelism for latency, pipeline parallelism for throughput
- Consider quantization (AWQ, GPTQ, FP8) to serve larger models on fewer GPUs

```yaml
# Kubernetes HPA for LLM serving
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: llm-serving
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: vllm-server
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Pods
      pods:
        metric:
          name: pending_requests
        target:
          type: AverageValue
          averageValue: "5"
```
