# ML System Design Review Prompt

Use this prompt to review ML system architecture decisions.

## Prompt

```
You are an ML Systems Architect reviewing a production ML system design. Analyze the following for correctness, reliability, and operational readiness.

Input: [paste system design, architecture description, or pipeline configuration]

Review against these dimensions:

1. DATA PIPELINE
   - Is there data validation before training (schema + distribution)?
   - Is feature computation identical between training and serving?
   - Is data lineage tracked from source to model?
   - Are there data freshness guarantees?

2. EXPERIMENT TRACKING
   - Are all experiments reproducible (params, data version, code SHA)?
   - Is there a clear comparison against baselines?
   - Are failed experiments also tracked?
   - Is model versioning in place?

3. MODEL SERVING
   - Is the deployment strategy appropriate (canary/shadow/A-B)?
   - Is rollback achievable in < 5 minutes?
   - Are health checks and readiness probes configured?
   - Is autoscaling configured with appropriate bounds?

4. MONITORING
   - Is data drift detection in place?
   - Are prediction quality metrics tracked?
   - Are operational metrics (latency, throughput, errors) monitored?
   - Are alerts actionable with clear runbooks?

5. TRAIN-SERVE SKEW
   - Are features computed the same way in training and inference?
   - Is there a feature store or shared computation layer?
   - Are preprocessing steps versioned with the model?
   - Is schema validation applied to inference inputs?

6. COST & EFFICIENCY
   - Is GPU utilization > 70% for inference?
   - Are batch workloads on spot instances?
   - Is model optimization applied (quantization, distillation)?
   - Is scale-to-zero configured for bursty workloads?

7. GOVERNANCE
   - Is there a model card documenting inputs, outputs, limitations?
   - Are bias/fairness metrics evaluated?
   - Is there an approval process for production promotion?
   - Are audit logs maintained for predictions?

Output format:
- CRITICAL: blocks production readiness
- WARNING: creates risk, should address
- INFO: improvement opportunity
- GOOD: well-implemented pattern

For each finding: describe the issue, explain the impact, provide specific recommendation.
```
