# Telemetry Cost Management

## The cost trap
Observability can cost MORE than the infrastructure it monitors. **2-5x infra cost** is common without active management.

## Cost drivers
- **Storage**: volume × retention.
- **Ingest**: events/second.
- **Query**: complexity × frequency.
- **Network**: egress between regions.

## Cost by signal (most → least expensive)
- **Traces**: highest cardinality, largest payloads.
- **Logs**: moderate.
- **Metrics**: cheapest.

Rough 2026 pricing:
- **Metrics**: $0.10-0.30 per 1000 active time series/month.
- **Logs**: $0.50-2.00 per GB ingested.
- **Traces**: $1-5 per million spans ingested.

## Strategies
- **Sampling**: head-based (simple, 10% = 10x savings), tail-based (keep interesting traces, 5-20x savings).
- **Retention tiers**: hot (7d, fast query), warm (30d, slower), cold (90d, archive, rare access).
- **Aggregation**: pre-aggregate metrics at the collector, drop raw after.
- **Filtering**: drop health-check spans, debug logs, and known-noisy sources at the collector.
- **Compression**: OTLP uses gzip — enable compression on all exporters.

## Right-sizing approach
Start with full collection for 1 week → measure actual volume → then apply sampling/filtering. Measure before optimizing.

## Options by scale
- **Grafana Cloud free tier**: 50GB logs, 10K metrics series, 50GB traces per month. Good for small projects.
- **Self-hosted**: Prometheus (metrics) + Loki (logs) + Tempo (traces) + Grafana = zero license cost, only compute/storage.

## Budgeting
Set a monthly telemetry budget per team/service. Alert at **80% consumption**.

## Anti-patterns
- No cost awareness → bill shock.
- Over-retention → keeping everything forever.
- No sampling → 100% of everything.
- Optimizing too early → measure first.
- Vendor lock-in without cost comparison.
