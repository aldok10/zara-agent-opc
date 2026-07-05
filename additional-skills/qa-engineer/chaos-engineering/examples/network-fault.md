---
type: example
title: "Network Fault Injection with Toxiproxy"
---

# Network Fault Injection with Toxiproxy

## Context
When validating that services handle network failures gracefully—timeouts, connection resets, bandwidth degradation. Run this before promoting to production to confirm retry logic, circuit breakers, and fallback behaviors work under real failure conditions.

## Code/Template

```yaml
# docker-compose.chaos.yml
services:
  toxiproxy:
    image: ghcr.io/shopify/toxiproxy:2.9.0
    ports:
      - "8474:8474"   # API port
      - "5432:5432"   # Proxied PostgreSQL
      - "6379:6379"   # Proxied Redis
    volumes:
      - ./toxiproxy.json:/config/toxiproxy.json
    command: ["-config", "/config/toxiproxy.json"]

  app:
    build: .
    environment:
      DATABASE_URL: postgres://user:pass@toxiproxy:5432/mydb
      REDIS_URL: redis://toxiproxy:6379
    depends_on:
      - toxiproxy
```

```json
// toxiproxy.json - Proxy definitions
[
  {
    "name": "postgres",
    "listen": "0.0.0.0:5432",
    "upstream": "postgres-real:5432",
    "enabled": true
  },
  {
    "name": "redis",
    "listen": "0.0.0.0:6379",
    "upstream": "redis-real:6379",
    "enabled": true
  }
]
```

```bash
#!/usr/bin/env bash
# chaos-experiments/network-fault.sh
set -euo pipefail

TOXI_API="http://localhost:8474"

echo "=== Experiment: Database latency spike ==="
echo "Hypothesis: API responds within 5s with cached fallback when DB latency > 3s"

# Add 4000ms latency to all postgres traffic
curl -s -X POST "$TOXI_API/proxies/postgres/toxics" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "db-latency",
    "type": "latency",
    "attributes": { "latency": 4000, "jitter": 500 },
    "toxicity": 1.0
  }'

# Verify app behavior under fault
echo "Sending test requests..."
for i in $(seq 1 5); do
  response=$(curl -s -o /dev/null -w "%{http_code} %{time_total}" http://localhost:3000/api/users)
  echo "  Request $i: $response"
done

# Clean up toxic
curl -s -X DELETE "$TOXI_API/proxies/postgres/toxics/db-latency"

echo ""
echo "=== Experiment: Redis connection reset ==="
echo "Hypothesis: App degrades to DB-only reads, no user-facing errors"

# Simulate connection reset on Redis
curl -s -X POST "$TOXI_API/proxies/redis/toxics" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "redis-reset",
    "type": "reset_peer",
    "attributes": { "timeout": 500 },
    "toxicity": 1.0
  }'

sleep 2

# Check health endpoint reports degraded (not down)
health=$(curl -s http://localhost:3000/health)
echo "Health status: $health"

# Verify requests still succeed
status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/users)
echo "API status code: $status"

curl -s -X DELETE "$TOXI_API/proxies/redis/toxics/redis-reset"

echo ""
echo "=== Experiment: Bandwidth throttle ==="
echo "Hypothesis: File uploads fail gracefully with user-friendly timeout message"

# Limit bandwidth to 1KB/s
curl -s -X POST "$TOXI_API/proxies/postgres/toxics" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "bandwidth-limit",
    "type": "bandwidth",
    "attributes": { "rate": 1 },
    "toxicity": 1.0
  }'

# Test upload endpoint
upload_response=$(curl -s -X POST http://localhost:3000/api/upload \
  -F "file=@./test-fixtures/sample-10mb.bin" \
  --max-time 10)
echo "Upload response: $upload_response"

curl -s -X DELETE "$TOXI_API/proxies/postgres/toxics/bandwidth-limit"

echo "=== All experiments complete ==="
```

## Key Points
- Always state a hypothesis before injecting faults—"what should happen?" not just "what breaks?"
- Clean up toxics after each experiment; leftover faults will pollute subsequent tests
- Run in staging with production-like traffic patterns; isolated unit environments miss interaction effects
