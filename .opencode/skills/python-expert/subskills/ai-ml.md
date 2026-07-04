# Python for AI/ML

Python owns prototyping, training, and research. For serving at scale, consider Go/Rust or a dedicated inference server — Python is the orchestration layer, not always the hot path.

## NumPy: Vectorize

Never loop over arrays. Vectorized ops are 100–1000x faster (C under the hood).

```python
# bad: for i in range(len(a)): out[i] = a[i] * b[i]
out = a * b                      # element-wise, vectorized
dist = np.sqrt((a - b) ** 2).sum(axis=1)
```

## DataFrames: Polars > Pandas

Polars is Rust-backed, lazy, multi-threaded (10–100x faster). Use Pandas only for library compatibility. See `data.md`.

## PyTorch

Dominant for training. Key inference/perf tools:

```python
model = torch.compile(model)          # graph optimization (2.x)

@torch.inference_mode()               # faster than no_grad for inference
def predict(x): return model(x)

with torch.autocast("cuda", dtype=torch.bfloat16):  # mixed precision
    loss = model(batch)
```

## Data Pipelines

Transform with Polars/DuckDB, store as Parquet, interchange via Arrow (zero-copy). Keep preprocessing reproducible and separate from training loop.

## Model Serving

- Simple: FastAPI + torch (`inference_mode`, batch requests)
- LLMs: vLLM (paged attention, high throughput)
- Framework-agnostic: ONNX Runtime, TorchServe

## Reproducibility

Pin all versions, set + save seeds (`torch.manual_seed`, `np.random.seed`), log hyperparameters (W&B/MLflow), version datasets. A result you can't reproduce is a rumor.

```python
torch.manual_seed(42); np.random.seed(42)
```

## GPU & Memory

Device-agnostic: `device = "cuda" if torch.cuda.is_available() else "cpu"`; `.to(device)` everywhere. Use mixed precision to cut memory. Stream large datasets with generators; `mmap` big files; call `torch.cuda.empty_cache()` only when genuinely needed.

## Anti-Patterns

- Python `for` loops over NumPy/torch arrays instead of vectorizing
- Pandas on >1GB data (use Polars/DuckDB)
- No seeds / unpinned deps → irreproducible runs
- Training a model with no serving story
- `.grad` tracking during inference (skip `inference_mode`)
- Hardcoded `cuda` that breaks on CPU-only machines
