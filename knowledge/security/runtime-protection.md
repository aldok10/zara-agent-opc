# Runtime Protection

## Rate Limiting

Controls request volume to prevent abuse and resource exhaustion.

| Algorithm | How It Works | Best For |
|-----------|-------------|----------|
| Token Bucket | Tokens refill at fixed rate, request consumes token | Bursty traffic with sustained limit |
| Sliding Window | Count requests in rolling time window | Smooth limiting, no boundary spikes |
| Fixed Window | Count requests per time slot (e.g., per minute) | Simple, but allows burst at window edges |
| Leaky Bucket | Requests queue and process at fixed rate | Smoothing output rate |

Apply at multiple layers:
- **Per-IP**: blocks scrapers, brute force (10-100 req/min typical)
- **Per-user**: prevents individual abuse (varies by endpoint)
- **Per-endpoint**: protect expensive operations (login: 5/min, search: 30/min)
- **Global**: protect infrastructure capacity

Where to implement: API gateway (Kong, Envoy), app middleware, WAF rules, CDN edge.

Return `429 Too Many Requests` with `Retry-After` header.

## WAF (Web Application Firewall)

Inspects HTTP traffic and blocks malicious patterns before they reach your app.

| WAF | Type | Notes |
|-----|------|-------|
| AWS WAF | Managed | Custom rules + managed rule groups |
| Cloudflare WAF | Edge | OWASP ruleset, bot management |
| ModSecurity + OWASP CRS | Self-hosted | Open-source, Nginx/Apache |

What WAFs block: SQL injection patterns, XSS payloads, path traversal (../../), protocol violations, known exploit signatures.

What WAFs miss: business logic flaws, IDOR, broken access control, zero-days.

A WAF is defense-in-depth, not a substitute for secure code.

## DDoS Mitigation

| Layer | Attack Type | Mitigation |
|-------|------------|------------|
| L3/L4 | SYN floods, UDP amplification, ICMP | Anycast, scrubbing centers, blackholing |
| L7 | HTTP floods, slowloris, API abuse | Rate limiting, behavioral analysis, challenges |

Services: Cloudflare, AWS Shield (Standard free, Advanced paid), Akamai Prolexic.

Key strategies:
- Anycast distributes traffic across PoPs
- Geo-blocking if traffic sources are known
- Auto-scaling absorbs legitimate spikes
- Connection timeouts kill slowloris
- Challenge pages (JS challenge, CAPTCHA) filter bots

## RASP (Runtime Application Self-Protection)

Agent embedded inside the application runtime. Sees actual execution context.

More accurate than WAF because it understands application flow. Heavier performance cost (2-5% typical).

Use case: blocking SQLi at the query layer even if WAF missed the payload because of encoding tricks.

Tools: Contrast Protect, Sqreen (now Datadog), OpenRASP.

## Bot Detection

| Technique | Catches | Bypassed By |
|-----------|---------|-------------|
| CAPTCHA (reCAPTCHA, hCaptcha) | Simple bots | CAPTCHA farms, ML solvers |
| Behavioral analysis | Scripted patterns | Sophisticated headless browsers |
| Browser fingerprinting | Headless browsers | Stealth plugins |
| Proof-of-work challenges | Volume attacks | Well-resourced attackers |
| Device attestation | Emulators | Rooted devices |

Layer multiple techniques. No single method is sufficient against determined attackers.

## Input Validation at Runtime

Even with type-safe languages, validate at system boundaries:

- **JSON Schema validation**: reject malformed requests before processing
- **Content-Type enforcement**: reject unexpected media types
- **Request size limits**: body size, header count, URL length
- **Field-level constraints**: max string length, numeric ranges, enum values
- **File upload validation**: magic bytes, not just extension

Validate early, fail fast, return clear errors without revealing internals.

## Security Monitoring

| What to Monitor | Why | Tool Examples |
|----------------|-----|---------------|
| Failed auth attempts | Brute force detection | fail2ban, custom alerting |
| Privilege escalation attempts | Lateral movement | SIEM rules, audit logs |
| Unusual API patterns | Enumeration, scraping | Anomaly detection, WAF logs |
| Dependency vulnerabilities | New CVEs on running code | Snyk monitor, Trivy scheduled |
| Certificate expiry | Outage prevention | cert-manager, monitoring |

Alert thresholds:
- 5+ failed logins same account in 5 min: lock + alert
- 10+ 403s from same IP in 1 min: rate limit + investigate
- Any 500 spike >3x baseline: page on-call

Ship logs to centralized system (ELK, Datadog, Grafana Loki). Retain auth/access logs 90+ days minimum.
