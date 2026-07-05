---
type: fact
title: "Product Experimentation"
---

# Product Experimentation

## Experimentation Ladder

From lowest to highest investment:

```
Painted Door → Fake Door → Wizard of Oz → Concierge → A/B Test → Full Build
```

Use the cheapest method that answers your specific question.

## A/B Testing

### When to Use
- Optimizing existing flows (not validating new concepts)
- Sufficient traffic for statistical significance
- Clear, measurable success metric exists
- Change is reversible

### Statistical Requirements
- **Sample size**: calculate BEFORE running (not after)
- **Minimum Detectable Effect**: smallest difference that matters to business
- **Significance level**: typically p<0.05 (5% false positive rate)
- **Power**: typically 80% (20% false negative rate)
- **Duration**: minimum 1 full business cycle (usually 2 weeks)

### Common Mistakes
- Peeking at results before reaching sample size (inflates false positives)
- Running too many variants (dilutes traffic, extends duration)
- Testing during holidays/anomalies (non-representative traffic)
- Stopping early when "significant" (regression to mean)
- No guardrail metrics (optimizing one metric while breaking others)

### Framework
```
Hypothesis: [Change X] will cause [metric Y] to [increase/decrease] by [Z%]
           because [reasoning based on evidence]
Metric: Primary: [what determines success]
        Guardrails: [what must not regress]
Duration: [calculated minimum run time]
Decision: Ship if primary improves ≥Z% AND guardrails don't regress
```

## Feature Flags

### Use Cases Beyond Testing
- Gradual rollout (1% → 10% → 50% → 100%)
- Kill switch for risky features
- Beta access for specific user segments
- Trunk-based development (merge incomplete features safely)

### Flag Types
| Type | Duration | Example |
|---|---|---|
| Release flag | Days-weeks | New checkout flow rollout |
| Experiment flag | 2-4 weeks | A/B test variant |
| Ops flag | Permanent | Circuit breaker, feature toggle |
| Permission flag | Permanent | Premium tier features |

### Lifecycle
```
Create → Test in staging → Canary (1%) → Ramp → Full rollout → Remove flag
```

Always remove release flags after full rollout. Tech debt accumulates fast.

## Fake Door Test

### How It Works
1. Show UI element for feature that doesn't exist yet
2. User clicks/taps → shows "coming soon" or waitlist
3. Measure: click rate = demand signal
4. Decide: build it or kill it based on measured interest

### Implementation
```
Button/link/menu item → Landing page explaining feature → Email capture/waitlist
```

### Ethical Considerations
- Be honest: "This feature is coming soon" (not "feature broken")
- Don't collect payment for non-existent features
- Remove quickly if not proceeding (don't mislead long-term)
- Measure interest, don't waste user time

### Metrics
- Click-through rate on the fake door element
- Waitlist signup rate (stronger signal than click alone)
- Segment analysis: which user types show interest?

## Wizard of Oz

### How It Works
User thinks they're interacting with automated system, but human performs the work behind the scenes.

### Examples
- "AI-powered" recommendations → human curator selecting items
- "Automated" report generation → analyst creating reports manually
- Chatbot prototype → human typing responses in real-time

### When to Use
- Validating that users WANT the output before building automation
- Complex ML/AI features where building the model is expensive
- Service businesses exploring product-led delivery

### Key Question
"Do users value the OUTPUT enough to justify building the SYSTEM?"

### Limitations
- Doesn't test scalability
- Human labor cost limits duration
- Can't test performance/speed expectations
- Ethical: inform users in research context

## Painted Door

Similar to fake door but lighter — measures awareness and interest without any interaction path.

### Examples
- Navigation menu item that leads to explanation page
- Marketing page describing upcoming feature (measure traffic)
- In-app banner measuring impression-to-click ratio

## Concierge

### How It Works
Manually deliver the full service to a small set of users, learning what they actually need before building at scale.

### Example Flow
```
1. Identify 5-10 target users
2. Manually perform the service (custom, high-touch)
3. Learn: what do they actually need? What's valuable?
4. Iterate the manual process until value is proven
5. Then automate/productize what works
```

### vs Wizard of Oz
- Wizard: user doesn't know it's manual (tests demand)
- Concierge: user knows it's manual/custom (tests value + workflow)

## Experiment Decision Framework

```
What's your question?
├── "Do users want this?" → Fake door / Painted door
├── "Is the output valuable?" → Wizard of Oz / Concierge
├── "Which version performs better?" → A/B test
├── "Will users pay for this?" → Pricing page test / Pre-order
└── "Does this work at scale?" → Gradual rollout with feature flags
```

## Metrics Hierarchy

1. **North Star**: one metric the experiment ultimately serves
2. **Primary**: what the experiment directly measures (decision criteria)
3. **Secondary**: supporting signals (helps explain primary)
4. **Guardrails**: must NOT regress (conversion, revenue, performance)

## Experiment Documentation

Every experiment should record:
- Hypothesis (with expected magnitude)
- Methodology (test type, duration, sample)
- Results (actual numbers, not just "it worked")
- Decision (ship / iterate / kill)
- Learnings (what did we discover about users?)
