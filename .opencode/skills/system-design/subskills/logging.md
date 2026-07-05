---
type: subskill
title: "Structured Logging"
---

# Structured Logging

Logs are your highest-fidelity signal for individual events. Structure them so machines can parse and humans can read.

## Format
- **Structured JSON** with consistent fields. Machine-parseable, human-readable with tooling.
- **Mandatory fields**: `timestamp`, `level`, `message`, `service_name`, `trace_id`, `span_id`.
- **Optional fields**: `user_id` (if available), `request_id`, `error` (structured), `duration_ms`, `component`.

## Log levels as signal
- **ERROR**: action required, something failed that shouldn't. Alert-worthy.
- **WARN**: degraded but functional, potential issue. Monitor trends.
- **INFO**: significant events (request handled, job completed, config loaded).
- **DEBUG**: verbose, development only. Never in production unless temporarily enabled.

## Sampling
High-traffic services emit millions of logs. Sample INFO/DEBUG at **1-10%**, keep **100% of ERROR/WARN**.

## Correlation
- `trace_id` in every log line. Query "all logs for trace abc123" → instant debugging.
- Pairs with tracing: pivot from a slow span straight to its logs.

## Tools
- **Loki**: Grafana stack, label-indexed, S3 backend, cheap.
- **ELK / OpenSearch**: full-text search, powerful, expensive.
- **CloudWatch / Stackdriver**: managed, integrated with cloud.

## Cost management
Logs are expensive at scale. Use retention tiers:
- 7 days hot (searchable), 30 days warm, 90 days cold (archive).
- Drop DEBUG logs after 24h.

## Sensitive data
NEVER log passwords, tokens, full credit card numbers, or PII without consent. Log reference IDs instead.

## Contextual logging
Use a request-scoped logger that automatically injects `trace_id`, `user_id`, etc., so every line carries context without manual plumbing.

## Anti-patterns
- Unstructured `printf` logs → unqueryable.
- Logging PII → compliance + security risk.
- Logging every request body → cost + security blowup.
- No log levels (everything INFO) → no signal.
- No correlation IDs → can't tie logs to traces.
