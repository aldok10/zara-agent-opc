# Multi-Component Tracing

Debugging distributed and multi-component systems where the error manifests in one layer but originates in another. The core principle: trace backward from symptom, verify at each boundary.

## When to Load

- Cross-service errors (service A returns 500 because service B timed out)
- Multi-layer issues (frontend -> API -> queue -> worker -> DB)
- Distributed system bugs where no single component shows the full picture
- Symptoms appear far from root cause (data corruption surfaces downstream)
- Intermittent failures that only occur under specific request paths

## Key Concepts

- **Trace correlation**: use a single request/correlation ID across all components. Without it, you're guessing which logs relate to which request.
- **Boundary instrumentation**: every component boundary (HTTP call, queue publish/consume, DB query) is a potential failure point. Instrument inputs and outputs at each.
- **Data flow verification**: trace the actual data (not assumed data) through each transformation step. Serialize and log the exact payload at boundaries.
- **Temporal ordering**: distributed logs are not ordered. Use timestamps + trace IDs to reconstruct the true sequence. Prefer logical clocks when available.
- **Blast radius mapping**: identify which components are affected vs. which are the source. Draw the dependency graph, mark failing edges.

## Workflow

1. **Identify the symptom boundary**: where does the error appear? Note: this is NOT necessarily where it originates.
2. **Collect traces/logs**: gather correlated logs from ALL components in the request path. Use trace_id or correlation_id. If no correlation exists, correlate by timestamp + payload fingerprint.
3. **Map the request flow**: draw the path (mentally or literally). List every component boundary the request crosses.
4. **Trace backward from symptom**: start at the failure point, examine the input it received. Was the input already bad? Move one hop upstream. Repeat.
5. **Verify at each boundary**: at each hop, confirm: did this component receive correct input AND produce correct output?
6. **Isolate the faulty boundary**: the bug lives where correct input enters but incorrect output exits.
7. **Confirm with evidence**: reproduce with diagnostic logging if existing telemetry is insufficient.
8. **Document the path**: record which boundary was faulty and why, for future incident response.

## Patterns

- **Add diagnostic logging at boundaries**: temporary structured logs at each component interface (request in, response out, queue message shape). Include timestamps and correlation IDs.
- **Contract verification**: check actual payload shape against expected schema at each boundary. Mismatches reveal the source. Use schema validation tools if available.
- **Replay isolation**: capture the input to a suspect component, replay it in isolation. If it fails alone, you found it. If it passes, the issue is environmental or temporal.
- **Dependency health check**: before deep-diving, verify all downstream dependencies are healthy. A degraded DB or queue explains many symptoms.
- **Bisect the path**: if the request path has many hops, check the midpoint first. Narrow to the half that contains the bug. Binary search is faster than linear.
- **Differential analysis**: compare a successful request trace against a failed one. The first divergence point is your suspect.

## Gotchas

- The component showing the error is rarely the component causing it. Resist the urge to fix where you see the symptom.
- Timeouts often cascade -- the FIRST timeout in the chain is the one to investigate.
- Retries can mask the original error. Check for retry storms that amplify a small failure.
- Clock skew between services makes log ordering unreliable. Prefer causal ordering (parent span -> child span) over wall-clock timestamps.
- Partial failures are common -- 1% of requests failing may be a specific shard, partition, or instance.
- Async boundaries (queues, events) break linear tracing. Ensure correlation IDs survive serialization/deserialization.
- Caches can serve stale data long after the source is fixed. Always check cache freshness when debugging stale state.

## Tools

- Distributed tracing: Jaeger, Tempo, Zipkin, AWS X-Ray
- Log aggregation: correlate by trace_id across services (Loki, ELK, CloudWatch)
- Network inspection: tcpdump, Wireshark for protocol-level issues
- Schema validation: JSON Schema, protobuf reflection for contract checks
- Service maps: visualize dependencies and identify critical paths

## Anti-Patterns

- Fixing the symptom layer without tracing upstream -- the bug will recur in a different form.
- Adding retries without understanding why the original request failed -- masks root cause.
- Blaming the network without evidence -- measure packet loss, latency, and DNS before concluding.
- Debugging in production without a reproduction plan -- always try to isolate first.
- Trusting a single log line as the full story -- one component's perspective is partial by definition.

## Verification

- Trace shows exactly which component boundary fails (correct input in, incorrect output out).
- Root cause is in the identified component, not downstream.
- Fix applied to the originating component, not the symptom layer.
- Diagnostic logging removed after resolution (or converted to permanent observability).
- Regression test covers the specific boundary that failed.
