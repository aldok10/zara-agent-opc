---
name: mlops
description: "MLOps engineering: model deployment, experiment tracking, feature stores, monitoring, drift detection"
---

# MLOps Engineering

## Scope

End-to-end ML lifecycle in production. Experiment tracking, model versioning, serving infrastructure, feature stores, monitoring, drift detection, A/B testing, and pipeline orchestration.

## First Action

Identify the ML framework (PyTorch, TensorFlow, scikit-learn, XGBoost). Check existing experiment tracking (MLflow, W&B, DVC). Determine serving target (REST API, batch, streaming). Read model registry state before proposing changes.

## Constraints

1. Every experiment must be reproducible -- log params, metrics, artifacts, git SHA
2. Model artifacts are immutable once registered -- never overwrite a version
3. Feature computation must be identical in training and serving (train-serve skew kills you)
4. Canary deployments required before full rollout for any model change
5. Data validation gates before training (schema + distribution checks)
6. Model cards required for production models (inputs, outputs, limitations, bias)
7. Rollback must complete in under 5 minutes
8. Monitoring must detect drift within 1 hour of onset
9. Feature stores must serve at p99 < 10ms for online features
10. Pipeline DAGs must be idempotent -- safe to retry any step
11. GPU utilization > 70% for inference or you're overspending
12. All model endpoints must have health checks and readiness probes
13. Training data lineage tracked from source to model version
14. Secrets (API keys, credentials) never in experiment configs

## DO NOT

1. Train on unvalidated data without schema checks
2. Deploy without baseline comparison metrics
3. Use different feature logic in training vs serving
4. Skip shadow mode for high-stakes models
5. Store model weights in git (use artifact stores)
6. Hardcode hyperparameters -- always parameterize
7. Deploy without rollback mechanism
8. Ignore data freshness -- stale features produce stale predictions
9. Skip bias/fairness evaluation for user-facing models

## Route to Subskill

| Signal | Target | Why |
|--------|--------|-----|
| Serving/inference/deploy | knowledge/model-serving.md | Deployment patterns |
| Experiment/tracking/MLflow | knowledge/experiment-tracking.md | Tracking guidance |
| Drift/monitoring/alerts | knowledge/model-monitoring.md | Monitoring patterns |
| Pipeline example | examples/mlflow-pipeline.py | Reference code |
| Architecture review | tools/ml-review-prompt.md | Structured review |

## Verification

- [ ] Experiments logged with all params, metrics, artifacts
- [ ] Model registered with version and stage
- [ ] Serving endpoint has health check and metrics
- [ ] Feature parity between training and serving validated
- [ ] Drift detection configured with alerting
- [ ] Canary/shadow deployment tested
- [ ] Rollback procedure documented and tested
- [ ] Data validation gates in pipeline

## Knowledge

- knowledge/model-serving.md -- inference patterns, A/B, shadow, canary, scaling
- knowledge/experiment-tracking.md -- MLflow, W&B, DVC, reproducibility
- knowledge/model-monitoring.md -- drift detection, performance degradation, alerts

## AI-Era Context (2026)

LLM serving dominates inference workloads. vLLM and TensorRT-LLM for token throughput optimization. LoRA adapters enable multi-tenant model serving. Feature stores now include embedding stores for RAG. MLflow 3.x has native LLM evaluation support. Model monitoring extends to hallucination detection and response quality scoring. GPU scheduling via Kubernetes with fractional GPU (MIG, time-slicing).

## Related Skills

- ai-engineering (RAG, agents, evals)
- system-design (distributed architecture)
- python-expert (implementation)
