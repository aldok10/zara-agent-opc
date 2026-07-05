# References

## k6 Load Testing (12 refs)
- **k6 Documentation** -- https://grafana.com/docs/k6/latest/ -- Official k6 documentation hub
- **k6 Getting Started** -- https://grafana.com/docs/k6/latest/get-started/ -- Installation, first script, and core concepts
- **k6 HTTP Requests** -- https://grafana.com/docs/k6/latest/using-k6/http-requests/ -- Making and validating HTTP requests
- **k6 Thresholds** -- https://grafana.com/docs/k6/latest/using-k6/thresholds/ -- Defining pass/fail criteria for performance
- **k6 Scenarios** -- https://grafana.com/docs/k6/latest/using-k6/scenarios/ -- Configuring VU behavior and load profiles
- **k6 Checks** -- https://grafana.com/docs/k6/latest/using-k6/checks/ -- Inline assertions during load tests
- **k6 Metrics** -- https://grafana.com/docs/k6/latest/using-k6/metrics/ -- Built-in and custom metrics
- **k6 Browser Module** -- https://grafana.com/docs/k6/latest/using-k6-browser/ -- Browser-based performance testing
- **k6 Extensions** -- https://grafana.com/docs/k6/latest/extensions/ -- xk6 extensions for custom protocols
- **k6 Cloud** -- https://grafana.com/docs/grafana-cloud/testing/k6/ -- Distributed load testing in the cloud
- **k6 Test Lifecycle** -- https://grafana.com/docs/k6/latest/using-k6/test-lifecycle/ -- init, setup, VU code, and teardown stages
- **k6 Output Integrations** -- https://grafana.com/docs/k6/latest/results-output/ -- Sending results to Grafana, Datadog, etc.

## Load Modeling (8 refs)
- **Load Test Types** -- https://grafana.com/docs/k6/latest/testing-guides/test-types/ -- Smoke, load, stress, spike, soak, breakpoint
- **Workload Modeling** -- https://www.perfbytes.com/workload-modeling -- Designing realistic load patterns from production data
- **Little's Law** -- https://www.process.st/littles-law/ -- Relationship between throughput, concurrency, and latency
- **Open vs Closed Models** -- https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/ -- Choosing the right arrival model
- **Ramp Patterns** -- https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ -- Executor types for different load shapes
- **Correlation and Parameterization** -- https://grafana.com/docs/k6/latest/examples/correlation-and-dynamic-data/ -- Handling dynamic values in load scripts
- **Think Time** -- https://grafana.com/docs/k6/latest/using-k6/thresholds/#think-time -- Modeling realistic user pacing
- **Data-Driven Testing** -- https://grafana.com/docs/k6/latest/examples/data-parameterization/ -- Using CSV/JSON data in load tests

## SRE Performance (10 refs)
- **Google SRE Book -- Monitoring** -- https://sre.google/sre-book/monitoring-distributed-systems/ -- Principles of monitoring distributed systems
- **Latency SLOs** -- https://sre.google/workbook/implementing-slos/ -- Setting and measuring latency objectives
- **USE Method** -- https://www.brendangregg.com/usemethod.html -- Utilization, Saturation, Errors methodology
- **RED Method** -- https://grafana.com/blog/2018/08/02/the-red-method-how-to-instrument-your-services/ -- Rate, Errors, Duration for service monitoring
- **Percentile Tail Latency** -- https://www.brendangregg.com/blog/2016-10-08/linux-perf-sched.html -- Understanding p99 and tail latency
- **Apdex Score** -- https://docs.newrelic.com/docs/apm/new-relic-apm/apdex/apdex-measure-user-satisfaction/ -- Application Performance Index calculation
- **Capacity Planning** -- https://sre.google/sre-book/software-engineering-in-sre/ -- Forecasting resource needs
- **Performance Budgets** -- https://web.dev/articles/performance-budgets-101 -- Setting budgets for web performance
- **Flame Graphs** -- https://www.brendangregg.com/flamegraphs.html -- Visualizing performance profiles
- **Core Web Vitals** -- https://web.dev/articles/vitals -- Google's metrics for user experience performance

## Other Tools (5 refs)
- **Gatling** -- https://docs.gatling.io/ -- Scala/Java-based load testing with code-first approach
- **Locust** -- https://docs.locust.io/ -- Python-based distributed load testing
- **Artillery** -- https://www.artillery.io/docs -- Node.js load testing with YAML scenarios
- **Vegeta** -- https://github.com/tsenart/vegeta -- HTTP load testing tool written in Go
- **wrk** -- https://github.com/wg/wrk -- Modern HTTP benchmarking tool with Lua scripting
