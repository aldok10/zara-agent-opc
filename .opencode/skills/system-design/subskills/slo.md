# SLO/SLI Design & Error Budgets

SLOs turn reliability into a measurable, negotiable target. They align engineering effort with what users actually experience.

## Definitions
- **SLI** (Service Level Indicator): a measurement of user experience. "What % of requests succeed within 200ms?"
- **SLO** (Service Level Objective): a target for an SLI. "99.9% of requests succeed within 200ms over 30 days."
- **Error budget**: `100% - SLO` = allowance for failure/experimentation. 99.9% SLO = 43.2 min downtime/month.

## Pick SLIs that matter to USERS (not ops)
- **Availability**: successful responses / total responses (exclude health checks).
- **Latency**: % of requests faster than threshold (use a histogram percentile, usually p99).
- **Correctness**: % of responses returning correct data (harder to measure, still important).
- **Freshness**: % of data queries returning data fresher than threshold (for async/batch systems).

## SLO target selection
Base targets on user tolerance, NOT engineering aspiration. Start conservative, tighten later.
- **99%** = 7.3 hours downtime/month (reasonable for internal tools).
- **99.9%** = 43.2 min/month (most production services).
- **99.99%** = 4.3 min/month (payments, auth  --  very expensive to maintain).

## Error budget policy (what happens as budget burns)
- **50% consumed**: review, no action needed.
- **75% consumed**: freeze risky changes, investigate top error sources.
- **100% consumed**: feature freeze, all engineering on reliability until budget recovers.

## Burn-rate alerting (multi-window, multi-burn-rate)
- **14.4x** burn rate for 1 hour = PAGE (2% of budget burned in 1 hour).
- **6x** burn rate for 6 hours = TICKET (page next business day).
- **1x** burn rate for 3 days = weekly review.

## Tools
- **Sloth**: SLO-as-code for Prometheus.
- **Google CUJ** framework (critical user journeys).
- **Nobl9**: commercial SLO platform.
- Custom Prometheus recording rules.

## Anti-patterns
- SLO at 100% → impossible, blocks all change.
- SLO based on infra metrics (CPU) → not user-facing.
- No error budget policy → SLO is decorative.
- Too many SLOs → focus on 3-5 per service.
