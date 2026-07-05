# References

## OpenTelemetry (9 refs)
- **OpenTelemetry Documentation** -- https://opentelemetry.io/docs/ -- Vendor-neutral observability framework for traces, metrics, logs
- **OTel Collector** -- https://opentelemetry.io/docs/collector/ -- Agent for receiving, processing, and exporting telemetry
- **OTel Go SDK** -- https://opentelemetry.io/docs/languages/go/ -- Instrumentation library for Go applications
- **OTel Semantic Conventions** -- https://opentelemetry.io/docs/specs/semconv/ -- Standardized attribute naming for telemetry
- **OTel Specification** -- https://opentelemetry.io/docs/specs/otel/ -- Protocol and API specification
- **OTel Operator** -- https://opentelemetry.io/docs/kubernetes/operator/ -- Kubernetes operator for auto-instrumentation
- **OTel Instrumentation** -- https://opentelemetry.io/docs/concepts/instrumentation/ -- Manual and automatic instrumentation patterns
- **OTLP Protocol** -- https://opentelemetry.io/docs/specs/otlp/ -- Wire format for telemetry data export
- **OTel Registry** -- https://opentelemetry.io/ecosystem/registry/ -- Instrumentation libraries and exporters

## Grafana Stack (7 refs)
- **Grafana Documentation** -- https://grafana.com/docs/grafana/latest/ -- Dashboard and visualization platform
- **Grafana Loki** -- https://grafana.com/docs/loki/latest/ -- Log aggregation system inspired by Prometheus
- **Grafana Tempo** -- https://grafana.com/docs/tempo/latest/ -- Distributed tracing backend
- **Grafana Mimir** -- https://grafana.com/docs/mimir/latest/ -- Scalable long-term metrics storage
- **Grafana Alloy** -- https://grafana.com/docs/alloy/latest/ -- OpenTelemetry-compatible telemetry collector
- **Grafana OnCall** -- https://grafana.com/docs/oncall/latest/ -- Incident response and on-call management
- **Grafana k6** -- https://grafana.com/docs/k6/latest/ -- Load testing and performance testing tool

## Prometheus (7 refs)
- **Prometheus Documentation** -- https://prometheus.io/docs/ -- Metrics collection and alerting toolkit
- **PromQL** -- https://prometheus.io/docs/prometheus/latest/querying/basics/ -- Query language for Prometheus metrics
- **Prometheus Operator** -- https://prometheus-operator.dev/ -- Kubernetes-native Prometheus deployment
- **Alertmanager** -- https://prometheus.io/docs/alerting/latest/alertmanager/ -- Alert routing, grouping, silencing
- **Recording Rules** -- https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/ -- Pre-computed query optimization
- **Prometheus Best Practices** -- https://prometheus.io/docs/practices/ -- Naming, instrumentation, alerting patterns
- **Thanos** -- https://thanos.io/tip/thanos/getting-started.md/ -- Highly available Prometheus with long-term storage

## SLOs & Reliability (6 refs)
- **Google SRE Workbook -- SLOs** -- https://sre.google/workbook/implementing-slos/ -- Practical SLO implementation guide
- **OpenSLO** -- https://openslo.com/ -- Vendor-neutral SLO specification format
- **Sloth** -- https://sloth.dev/ -- SLO-based Prometheus alerting generator
- **Pyrra** -- https://github.com/pyrra-dev/pyrra -- SLO monitoring and alerting for Prometheus
- **Nobl9** -- https://docs.nobl9.com/ -- SLO management platform
- **Error Budgets** -- https://sre.google/sre-book/embracing-risk/ -- Using error budgets to balance reliability and velocity

## Distributed Tracing (4 refs)
- **Jaeger** -- https://www.jaegertracing.io/docs/ -- Distributed tracing platform (CNCF graduated)
- **Zipkin** -- https://zipkin.io/ -- Distributed tracing system
- **W3C Trace Context** -- https://www.w3.org/TR/trace-context/ -- Standard for distributed trace propagation
- **Baggage** -- https://www.w3.org/TR/baggage/ -- Context propagation for metadata

## Logging (4 refs)
- **Fluentd** -- https://docs.fluentd.org/ -- Unified logging layer (CNCF graduated)
- **Fluent Bit** -- https://docs.fluentbit.io/ -- Lightweight log processor and forwarder
- **Vector** -- https://vector.dev/docs/ -- High-performance observability data pipeline
- **Structured Logging** -- https://www.honeycomb.io/blog/structured-logging-and-your-team -- Patterns for machine-parseable logs

## Alerting & Incident (5 refs)
- **PagerDuty Operations Guide** -- https://response.pagerduty.com/ -- Incident response and on-call best practices
- **Alertmanager Configuration** -- https://prometheus.io/docs/alerting/latest/configuration/ -- Routing, receivers, inhibition rules
- **Dead Man's Snitch** -- https://deadmanssnitch.com/docs -- Monitoring for expected periodic jobs
- **Opsgenie** -- https://support.atlassian.com/opsgenie/ -- Alert management and on-call scheduling
- **Robusta** -- https://docs.robusta.dev/ -- Kubernetes-native alerting and automation
