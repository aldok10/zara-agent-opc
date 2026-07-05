# Model Serving

Inference patterns, request batching, GPU allocation, and scaling strategies for production ML models.

## When to Load

- Deploying ML models to production
- Choosing between real-time and batch inference
- Optimizing GPU utilization and cost
- Designing inference infrastructure for scale

## Key Concepts

**Inference Patterns** -- Real-time (synchronous, low-latency API), batch (scheduled, high-throughput), streaming (continuous, event-driven), edge (on-device, offline-capable).

**Request Batching** -- Group multiple inference requests into a single forward pass. Increases GPU utilization. Dynamic batching: wait up to N ms to fill a batch of size M. Tradeoff: latency vs throughput.

**GPU Allocation** -- Right-sizing: model size vs GPU memory. Multi-model serving: pack multiple models on one GPU. Fractional GPUs (MIG, time-sharing). Spot instances for batch workloads.

**Model Optimization** -- Quantization (FP32 -> FP16/INT8), pruning (remove low-weight connections), distillation (train smaller model from larger), ONNX export (framework-agnostic runtime).

**Autoscaling** -- Scale on: request queue depth, GPU utilization, latency percentiles. Scale-to-zero for infrequent models. Warm-up time matters (model loading is expensive).

## Patterns

```yaml
# Triton Inference Server config
model_repository/
  text-classifier/
    config.pbtxt:
      max_batch_size: 32
      dynamic_batching:
        preferred_batch_size: [8, 16, 32]
        max_queue_delay_microseconds: 100000  # 100ms max wait
      instance_group:
        - count: 2
          kind: KIND_GPU
          gpus: [0]

# Kubernetes HPA for inference
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  minReplicas: 1
  maxReplicas: 10
  metrics:
    - type: External
      external:
        metric:
          name: inference_queue_depth
        target:
          type: AverageValue
          averageValue: "5"
    - type: Pods
      pods:
        metric:
          name: gpu_utilization
        target:
          type: AverageValue
          averageValue: "70"
```

```python
# Model optimization pipeline
import torch
from torch.quantization import quantize_dynamic

model = load_trained_model()

# Dynamic quantization (CPU inference)
quantized = quantize_dynamic(model, {torch.nn.Linear}, dtype=torch.qint8)

# Export to ONNX
torch.onnx.export(model, dummy_input, "model.onnx", opset_version=17)

# TensorRT optimization (GPU inference)
# trtexec --onnx=model.onnx --saveEngine=model.trt --fp16
```

## Gotchas

- GPU memory fragmentation after multiple model loads/unloads -- restart pods periodically
- Dynamic batching with high max_queue_delay adds latency to ALL requests, not just the ones waiting
- Quantization can silently degrade model quality -- always measure accuracy after optimization
- Scale-to-zero saves cost but first request after scale-up takes 30s+ (model loading)
- A/B testing models in production requires traffic splitting at the inference layer, not just feature flags

## Verification

- Latency SLA: p99 < target under expected load (measure after batching, not per-request)
- GPU utilization stays 60-80% (below = over-provisioned, above = approaching saturation)
- Quantized model accuracy within acceptable degradation (define threshold before deployment)
- Autoscaling responds to load within acceptable time (test with traffic spikes)
- Model version rollback takes < 5 minutes (hot-swap without pod restart if possible)
