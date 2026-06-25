# LLM Inference Optimization Stack

Reference for production LLM serving: techniques, tradeoffs, and decision points.

## The Optimization Hierarchy

From highest to lowest impact (diminishing returns):

1. **Model selection** -- smaller model that meets quality bar (biggest win)
2. **Quantization** -- INT8/INT4 (2-4x memory/speed, minimal quality loss)
3. **KV Cache optimization** -- GQA, paged attention, cache compression
4. **Batching** -- continuous batching, dynamic batch sizing
5. **Speculative decoding** -- draft model accelerates generation 2-4x
6. **Hardware** -- GPU selection, tensor parallelism, memory bandwidth
7. **Kernel optimization** -- FlashAttention, fused operations

## Quantization Quick Reference

| Method | Bits | Quality Loss | Speed Gain | Best For |
|--------|------|-------------|------------|----------|
| FP16/BF16 | 16 | ~0% | 2x vs FP32 | Training, high-quality serving |
| GPTQ | 4 | 1-3% | 3-4x | GPU serving with quality needs |
| AWQ | 4 | 1-2% | 3-4x | Best 4-bit quality on GPU |
| GGUF Q4_K_M | 4-5 | 2-4% | 3x | CPU/local inference (llama.cpp) |
| GGUF Q8_0 | 8 | <1% | 2x | CPU/local with quality priority |
| INT8 (smooth) | 8 | <1% | 2x | Production GPU serving |

## KV Cache Strategies

| Strategy | Mechanism | Memory Saving | Tradeoff |
|----------|-----------|---------------|----------|
| GQA (Grouped Query Attention) | Share KV heads across Q heads | 4-8x | Built into model architecture |
| PagedAttention (vLLM) | Virtual memory for KV blocks | Reduces fragmentation | Implementation complexity |
| Sliding window | Only attend to last N tokens | Linear cap | Loses long-range context |
| KV compression | Quantize/prune cached vectors | 2-4x | Slight quality degradation |
| Offloading | Spill to CPU/disk | Unlimited context | Latency spike on cache miss |

## Serving Frameworks

| Framework | Strength | When to Use |
|-----------|----------|-------------|
| vLLM | PagedAttention, high throughput | Production API serving |
| TGI (HuggingFace) | Easy deployment, wide model support | Quick prototyping |
| llama.cpp | CPU/Metal/CUDA, GGUF format | Local/edge inference |
| TensorRT-LLM | NVIDIA-optimized, maximum perf | NVIDIA GPU at scale |
| Ollama | Simplest UX, wraps llama.cpp | Developer local use |
| SGLang | Speculative + RadixAttention | Complex multi-turn workloads |

## Key Metrics

| Metric | Definition | Target Range |
|--------|-----------|--------------|
| TTFT | Time To First Token | <200ms (interactive) |
| TPS | Tokens Per Second (generation) | 30-100+ (depends on model) |
| Throughput | Total tokens/sec across all requests | Maximize |
| P99 latency | 99th percentile response time | <2s for chat |
| Cost per token | $/1M tokens (input + output) | Minimize |

## Decision Framework

```
Need maximum quality?
  → Use largest model that fits budget
  → FP16/BF16, no quantization
  → Optimize batching and KV cache

Need to fit on consumer hardware?
  → Quantize to Q4_K_M (GGUF) or AWQ
  → Use llama.cpp or Ollama
  → Consider smaller model first

Need high throughput API?
  → vLLM + continuous batching
  → INT8 or AWQ quantization
  → GQA model architecture (LLaMA 3, Mistral)
  → Speculative decoding for latency-sensitive paths

Need lowest latency?
  → Smaller model + speculative decoding
  → TensorRT-LLM with in-flight batching
  → KV cache warm-up for common prefixes
```
