# Model Serving Patterns

## Inference Architectures

### Real-Time (Online)

Request-response serving for low-latency predictions.

**When to use**: user-facing features, recommendations, fraud detection, search ranking.

**Stack options (2026)**:
- TorchServe / Triton Inference Server -- multi-framework, GPU optimized
- vLLM -- LLM-specific, continuous batching, PagedAttention
- TensorRT-LLM -- NVIDIA optimized LLM serving
- BentoML -- Python-native, multi-model
- Ray Serve -- scalable, composable inference graphs
- KServe -- Kubernetes-native, serverless inference

**Key metrics**: latency (p50, p95, p99), throughput (req/s), GPU utilization

### Batch

Scheduled or triggered bulk inference.

**When to use**: daily scoring, embedding generation, report generation, ETL enrichment.

**Stack options**: Spark MLlib, Ray Data, custom jobs on Kubernetes.

**Key metrics**: throughput (records/s), cost per prediction, completion time

### Streaming

Continuous inference on event streams.

**When to use**: anomaly detection on IoT data, real-time personalization, fraud on transactions.

**Stack**: Flink ML, Kafka + model sidecar, Ray Serve with streaming.

## Deployment Strategies

### Shadow Mode

Run new model alongside production, discard new model's predictions.

- Zero user impact
- Compare predictions offline
- Use for high-stakes models (medical, financial)
- Duration: 1-2 weeks minimum

### Canary

Route small percentage of traffic to new model.

- Start at 1-5% traffic
- Monitor error rate and business metrics
- Auto-rollback if metrics degrade beyond threshold
- Gradual ramp: 5% -> 25% -> 50% -> 100%

### A/B Testing

Statistical comparison between model versions.

- Requires sufficient sample size for significance
- Define primary metric and guardrail metrics upfront
- Typical duration: 1-4 weeks depending on traffic
- Use sequential testing for early stopping

### Blue-Green

Two full environments, instant switch.

- Fastest rollback (DNS/load balancer flip)
- Higher cost (double infrastructure during transition)
- Good for batch model updates with hard cutover

## Scaling Patterns

### Horizontal Pod Autoscaling

- Scale on GPU utilization (target: 70-80%)
- Scale on request queue depth
- Use KEDA for event-driven scaling (queue length)
- Minimum replicas: 2 for availability

### Model Optimization

| Technique | Latency Reduction | Quality Loss | Use Case |
|-----------|-------------------|--------------|----------|
| Quantization (INT8) | 2-4x | < 1% | Most models |
| Quantization (INT4) | 4-8x | 1-5% | LLMs with GPTQ/AWQ |
| Distillation | 3-10x | 2-5% | Deploy smaller model |
| Pruning | 1.5-3x | < 2% | Sparse inference |
| Speculative decoding | 2-3x | 0% | LLM token generation |
| KV-cache optimization | 1.5-2x | 0% | Long-context LLMs |

### Multi-Model Serving

- Model multiplexing: multiple LoRA adapters on one base model
- Model routing: different models per request type
- Ensemble: combine predictions from multiple models
- Cascade: cheap model first, expensive model for low-confidence

## Infrastructure

### GPU Selection (2026)

| GPU | Use Case | VRAM |
|-----|----------|------|
| NVIDIA L4 | Inference (small-medium models) | 24 GB |
| NVIDIA A10G | Inference + fine-tuning | 24 GB |
| NVIDIA A100 | Training + large model inference | 40/80 GB |
| NVIDIA H100 | Large model training + inference | 80 GB |
| NVIDIA H200 | LLM inference (high bandwidth) | 141 GB |

### Container Configuration

- Base image: NVIDIA NGC containers (CUDA + cuDNN pre-configured)
- Health check: `/health` (liveness) + `/ready` (model loaded)
- Startup probe: generous timeout (model loading can take minutes)
- Resource limits: set GPU memory to prevent OOM
- Shared memory: increase `/dev/shm` for PyTorch DataLoader

### Cost Optimization

- Spot/preemptible instances for batch inference
- Scale to zero during off-peak (KServe serverless)
- Right-size GPU: don't use H100 for a 1B parameter model
- Batch requests where latency allows (dynamic batching)
- Cache frequent predictions (embedding cache)
