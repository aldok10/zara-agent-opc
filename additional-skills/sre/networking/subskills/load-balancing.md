# Load Balancing

L4/L7 load balancing, algorithms, health checks, and connection draining.

## When to Load
- Choosing between L4 and L7 load balancers
- Configuring health checks for reliable routing
- Implementing connection draining for zero-downtime deploys
- Tuning load balancing algorithms for specific workloads

## Key Concepts

**L4 (transport) vs L7 (application):**
- L4: TCP/UDP, fast, no content inspection, preserves client IP (with DSR/proxy protocol)
- L7: HTTP/gRPC, content-based routing, SSL termination, header manipulation, WebSocket support

**Algorithms:**
- Round Robin: equal distribution (default, simple)
- Least Connections: route to least-busy backend
- Weighted: manual traffic proportion
- Consistent Hashing: sticky by key (IP, header, cookie)
- Random with Two Choices (P2C): low-latency selection

**Health checks:** Active (LB probes backends) vs Passive (detect failures from real traffic). Use both for reliability.

**Connection draining:** stop sending new connections while allowing in-flight requests to complete. Critical for graceful deployments.

## Patterns

**Kubernetes Service with session affinity:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: api
spec:
  type: ClusterIP
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 3600
  ports:
    - port: 80
      targetPort: 8080
```

**Envoy load balancing (least request):**
```yaml
clusters:
  - name: backend
    type: STRICT_DNS
    lb_policy: LEAST_REQUEST
    health_checks:
      - timeout: 2s
        interval: 10s
        unhealthy_threshold: 3
        healthy_threshold: 2
        http_health_check:
          path: /healthz
          expected_statuses:
            - start: 200
              end: 299
    outlier_detection:
      consecutive_5xx: 3
      interval: 10s
      base_ejection_time: 30s
      max_ejection_percent: 50
```

**AWS ALB with slow start (Terraform):**
```hcl
resource "aws_lb_target_group" "api" {
  name     = "api-targets"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    path                = "/healthz"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 15
    timeout             = 5
    matcher             = "200"
  }

  slow_start = 60

  deregistration_delay = 30

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 3600
    enabled         = true
  }
}
```

**Graceful shutdown (app-level drain):**
```go
srv := &http.Server{Addr: ":8080", Handler: mux}
go srv.ListenAndServe()

sigCh := make(chan os.Signal, 1)
signal.Notify(sigCh, syscall.SIGTERM)
<-sigCh

ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()
srv.Shutdown(ctx)
```

## Gotchas
- L4 LB can't do path-based routing -- need L7 for that
- Health check interval too aggressive overwhelms small backends
- Sticky sessions break even distribution -- use only when stateful
- Connection draining timeout must exceed longest expected request duration
- Outlier detection can cascade-eject under high error rates -- set max_ejection_percent
- WebSocket connections are long-lived -- connection limits and draining behave differently
- Kubernetes readiness probe removal propagation takes seconds -- use preStop hooks

## Verification
- Check backend health: LB provider dashboard or API
- `kubectl get endpoints <service>` for Kubernetes backend list
- Access logs for traffic distribution verification
- Metrics: requests per backend, p99 latency per backend, 5xx rate
- Test draining: `kubectl drain` or deregister and watch in-flight requests
- Connection count per backend to detect imbalance
