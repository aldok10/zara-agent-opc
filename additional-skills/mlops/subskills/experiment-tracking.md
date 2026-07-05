---
type: subskill
title: "Experiment Tracking"
---

# Experiment Tracking

MLflow, Weights & Biases, reproducibility, and model registry for ML experimentation.

## When to Load

- Setting up ML experiment tracking infrastructure
- Ensuring experiment reproducibility
- Managing model versions and transitions to production
- Comparing and selecting models for deployment

## Key Concepts

**Experiment Tracking** -- Record: hyperparameters, metrics, artifacts, code version, data version, environment. Every training run is an experiment. Compare runs to identify what works.

**Reproducibility** -- Same code + same data + same config = same results. Requires: pinned dependencies, fixed random seeds, versioned data, logged environment. Without this, ML is alchemy.

**Model Registry** -- Central catalog of trained models. Stages: None -> Staging -> Production -> Archived. Metadata: metrics, training data version, author, approval status.

**MLflow** -- Open-source. Tracking (log params/metrics), Projects (reproducible runs), Models (packaging), Registry (lifecycle management). Self-hosted or managed (Databricks).

**Weights & Biases (W&B)** -- SaaS-first. Superior visualization, hyperparameter sweeps, artifact tracking, report generation. Better UX, higher cost, vendor dependency.

## Patterns

```python
# MLflow experiment tracking
import mlflow

mlflow.set_experiment("text-classification-v2")

with mlflow.start_run(run_name="bert-base-lr-sweep"):
    mlflow.log_params({
        "model": "bert-base-uncased",
        "learning_rate": 2e-5,
        "batch_size": 32,
        "epochs": 3,
        "max_length": 512,
        "data_version": "v2.3.1",
    })

    model = train(config)

    mlflow.log_metrics({
        "accuracy": 0.923,
        "f1_macro": 0.891,
        "eval_loss": 0.234,
    })

    mlflow.log_artifact("confusion_matrix.png")
    mlflow.pytorch.log_model(model, "model")

    # Register for production consideration
    mlflow.register_model(
        f"runs:/{mlflow.active_run().info.run_id}/model",
        "text-classifier-prod"
    )
```

```python
# Reproducibility checklist as code
import hashlib, json, subprocess

def log_reproducibility_context(run):
    run.log_params({
        "git_commit": subprocess.check_output(["git", "rev-parse", "HEAD"]).strip(),
        "git_dirty": subprocess.check_output(["git", "status", "--porcelain"]).strip() != b"",
        "python_version": sys.version,
        "torch_version": torch.__version__,
        "cuda_version": torch.version.cuda,
        "random_seed": 42,
        "data_hash": hashlib.md5(open("data/train.csv", "rb").read()).hexdigest(),
    })
```

```yaml
# MLflow Model Registry lifecycle
stages:
  None: "Newly registered, not evaluated"
  Staging: "Passed offline evaluation, testing in shadow mode"
  Production: "Serving live traffic"
  Archived: "Replaced by newer version, retained for rollback"

promotion_criteria:
  None -> Staging:
    - Accuracy > baseline (current production model)
    - No data leakage detected
    - Training data version documented
  Staging -> Production:
    - Shadow mode metrics match offline evaluation
    - Latency within SLA
    - A/B test shows improvement (if applicable)
    - Approval from ML lead
```

## Gotchas

- Not logging data versions makes experiments non-reproducible even with perfect code tracking
- GPU non-determinism (cuDNN) means bitwise-identical results are often impossible -- track acceptable variance
- MLflow UI becomes slow with 10,000+ runs -- use tags and search aggressively
- Model registry without clear promotion criteria becomes a dumping ground
- Tracking too many metrics creates dashboard noise -- define 3-5 primary metrics per project

## Verification

- Can you reproduce a run from 3 months ago using only the logged metadata?
- Every model in production can be traced to a specific training run with full lineage
- Comparison between models uses the same evaluation dataset and metrics
- Registry has clear owners and stage transition policies enforced (not just documented)
- Experiment naming convention exists and is followed (team-discoverable)
