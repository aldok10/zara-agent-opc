---
type: fact
title: "Risk Scoring - 5x5 Matrix, DREAD, CVSS, Prioritization"
---

# Risk Scoring

Risk scoring quantifies threats to enable prioritization. No single model fits all contexts — choose based on audience and precision needs.

## 5x5 Risk Matrix

A qualitative approach mapping likelihood against impact.

### Likelihood Scale

| Score | Level | Description |
|-------|-------|-------------|
| 1 | Rare | Requires extraordinary circumstances |
| 2 | Unlikely | Could occur but not expected |
| 3 | Possible | Might occur during system lifetime |
| 4 | Likely | Expected to occur multiple times |
| 5 | Almost Certain | Will occur frequently without controls |

### Impact Scale

| Score | Level | Description |
|-------|-------|-------------|
| 1 | Negligible | No meaningful effect on operations |
| 2 | Minor | Localized disruption, quick recovery |
| 3 | Moderate | Significant disruption, recovery within days |
| 4 | Major | Severe harm, extended recovery, regulatory notice |
| 5 | Critical | Catastrophic loss, existential threat, public harm |

### Risk Rating = Likelihood x Impact

| Rating | Range | Action |
|--------|-------|--------|
| Critical | 20-25 | Immediate mitigation required, escalate to leadership |
| High | 12-19 | Treat within current sprint/cycle |
| Medium | 6-11 | Plan mitigation within quarter |
| Low | 1-5 | Accept or monitor, address opportunistically |

## DREAD Model

Developed at Microsoft for threat prioritization. Score each factor 1-10:

| Factor | Question |
|--------|----------|
| **D**amage | How severe is the impact if exploited? |
| **R**eproducibility | How easy is it to reproduce the attack? |
| **E**xploitability | How much skill/effort to launch the attack? |
| **A**ffected users | What percentage of users are impacted? |
| **D**iscoverability | How easy is it to find the vulnerability? |

**Risk = (D + R + E + A + D) / 5**

Ranges: 1-3 Low, 4-6 Medium, 7-10 High.

Criticism: Discoverability is debated — some organizations assume all vulnerabilities are discoverable (score = 10) to avoid false sense of security.

## CVSS v4.0

Common Vulnerability Scoring System — industry standard for vulnerability severity.

### Metric Groups

| Group | Purpose |
|-------|---------|
| Base | Intrinsic properties (attack vector, complexity, privileges, impact on CIA) |
| Threat | Current exploit activity, availability of exploit code |
| Environmental | Organization-specific: asset criticality, existing controls |
| Supplemental | Additional context: automatable, recovery, value density |

### Base Score Components

- **Attack Vector:** Network > Adjacent > Local > Physical
- **Attack Complexity:** Low > High
- **Privileges Required:** None > Low > High
- **User Interaction:** None > Passive > Active
- **Impact:** Confidentiality, Integrity, Availability (each: None/Low/High)
- **Scope:** whether impact extends beyond the vulnerable component

### Severity Ratings

| Score | Rating |
|-------|--------|
| 9.0 - 10.0 | Critical |
| 7.0 - 8.9 | High |
| 4.0 - 6.9 | Medium |
| 0.1 - 3.9 | Low |
| 0.0 | None |

CVSS v4.0 changes from v3.1: replaced Scope with explicit vulnerable/subsequent system impact, added Supplemental metrics, refined User Interaction granularity.

## Risk Appetite Definition

Risk appetite is the amount of risk an organization is willing to accept in pursuit of objectives.

**Defining appetite:**
1. Identify organizational risk tolerance per domain (financial, reputational, regulatory)
2. Set thresholds: "We accept Low risks. Medium risks require documented mitigation plan."
3. Document exception process for accepting risks above threshold
4. Review quarterly or after significant incidents

## Threat Prioritization Methodology

1. **Score all identified threats** using chosen model (matrix, DREAD, or CVSS)
2. **Apply context:** business criticality of affected asset, existing controls, regulatory exposure
3. **Rank by adjusted risk score** — not raw score alone
4. **Group into action tiers:**
   - Tier 1: Fix now (blocking release)
   - Tier 2: Fix this cycle
   - Tier 3: Backlog with review date
   - Tier 4: Accept with documented rationale
5. **Reassess after mitigation** — verify residual risk is within appetite

## Risk Acceptance Criteria

A risk can be formally accepted when ALL conditions are met:

- Risk owner is identified and has authority to accept
- Residual risk falls within organizational appetite
- Compensating controls are documented
- Acceptance has an expiration date (force re-evaluation)
- Business justification is recorded
- Acceptance is reviewed during periodic risk assessments

Never accept risk by omission — undocumented acceptance is unmanaged risk.

## Choosing a Model

| Context | Recommended |
|---------|-------------|
| Quick threat model triage | 5x5 matrix |
| Development team prioritization | DREAD |
| Vulnerability management / CVE tracking | CVSS v4.0 |
| Executive communication | 5x5 matrix with heatmap |
| Compliance evidence | CVSS (industry-recognized standard) |
