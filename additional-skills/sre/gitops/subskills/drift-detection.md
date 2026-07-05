---
type: subskill
title: "Drift Detection"
---

# Drift Detection

## Core Concepts
- Drift: divergence between desired state (git) and actual state (live cluster/infrastructure)
- Sources of drift: manual kubectl edits, operator mutations, failed partial syncs, external controllers
- Detection methods: periodic reconciliation, webhook-triggered checks, continuous diffing
- Drift is distinct from intentional mutations (HPA scaling, cert-manager annotations)
- Acceptable drift must be explicitly configured as ignored fields

## Key Practices
- Configure ignore rules for fields managed by controllers (`.status`, HPA replica count, annotations from operators)
- Set reconciliation intervals short enough to catch drift before it causes incidents (1-5 min)
- Alert on drift detection rather than auto-remediating in all cases (some drift signals unauthorized access)
- Use `kubectl diff` or tooling (kubediff, driftctl) for infrastructure-level drift checks
- Audit drift events: who/what caused the divergence (RBAC + audit logs)

## Common Mistakes
- Auto-healing all drift without investigating—could mask security incidents or operator bugs
- Setting reconciliation intervals too long, allowing drift to persist and compound
- Not excluding dynamic fields, causing constant "drift detected" noise

## When to Apply
- Operating GitOps workflows where cluster state must match git source of truth
- Implementing compliance controls requiring infrastructure consistency verification
- Debugging unexpected behavior caused by manual changes to managed resources
