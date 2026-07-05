---
type: fact
title: "Experiment Tracking"
---

# Experiment Tracking

## Why Track

Every ML experiment must answer: what changed, what happened, can I reproduce it?

Without tracking, you get "it worked on my machine" for models.

## Core Artifacts to Log

| Category | Items |
|----------|-------|
| Parameters | hyperparameters, data splits, preprocessing config |
| Metrics | training loss, validation metrics, per-class scores |
| Artifacts | model weights, plots, confusion matrices, SHAP values |
| Environment | git SHA, dependency versions, hardware specs |
| Data | dataset version/hash, feature schema, sample count |

## Tool Comparison (2026)

### MLflow

- Open source, self-hostable, vendor-neutral
- MLflow 3.x: native LLM tracing, GenAI evaluation
- Model Registry with stages (Staging, Production, Archived)
- Tracking server + artifact store (S3/GCS/Azure Blob)
- Integrations: all major ML frameworks
- Best for: teams wanting control and no vendor lock-in

### Weights & Biases (W&B)

- SaaS-first (self-hosted available)
- Superior visualization and collaboration
- Sweeps for hyperparameter optimization
- W&B Launch for job orchestration
- Weave for LLM application tracing
- Best for: research teams, rapid experimentation

### DVC (Data Version Control)

- Git-based approach to data and model versioning
- DVC pipelines for DAG definition
- Studio for visualization
- Best for: teams that want git-native ML workflows

### Comparison Matrix

| Feature | MLflow | W&B | DVC |
|---------|--------|-----|-----|
| Self-hosted | Yes | Yes (enterprise) | Yes |
| Model registry | Yes | Yes | Via Studio |
| LLM tracing | Yes (v3) | Yes (Weave) | No |
| Pipeline DAG | Limited | Launch | Yes |
| Data versioning | Via artifacts | Artifacts | Core feature |
| Cost | Free/OSS | Free tier + paid | Free/OSS |

## Reproducibility Checklist

1. **Code version**: git SHA pinned to experiment
2. **Data version**: hash or version ID of training data
3. **Environment**: Docker image or `requirements.txt` with pinned versions
4. **Random seeds**: set and logged (numpy, torch, python)
5. **Hardware**: GPU type, count, CUDA version logged
6. **Config**: all hyperparameters in a single config file (not scattered)

## Experiment Organization

### Naming Convention

```
{project}/{model_type}/{date}_{description}
```

Example: `fraud-detection/xgboost/2026-07-05_feature-v3-tuned`

### Tagging Strategy

- `baseline` -- reference point for comparison
- `production` -- currently serving
- `candidate` -- ready for evaluation
- `experiment` -- exploratory, may not converge

### Metric Comparison

Always compare against:
1. Current production model
2. Baseline (simplest reasonable model)
3. Previous best experiment

## Pipeline Integration

### Training Pipeline Steps

```
1. Data validation (schema + stats)
2. Feature engineering
3. Train (with experiment logging)
4. Evaluate (metrics + fairness)
5. Register model (if metrics pass gate)
6. Trigger deployment pipeline
```

### Automated Retraining

Triggers:
- Scheduled (weekly/monthly)
- Data drift detected
- Performance degradation below threshold
- New labeled data exceeds threshold

Gates:
- Metrics must exceed current production model
- No regression on fairness metrics
- Data validation passes
- Model size within serving constraints

## Anti-Patterns

- Logging only final metrics (log per-epoch for debugging)
- Not logging failed experiments (failures are information)
- Mutable experiment records (append-only)
- Manual metric comparison (automate with threshold gates)
- Disconnecting training code from experiment config
