---
type: tool
title: "Device Test Matrix Design Prompt"
---

# Device Test Matrix Design Prompt

## Purpose
Design a prioritized device/OS test matrix that maximizes coverage with minimal device count based on analytics and market data.

## When to Use
- Setting up a mobile test lab (physical or cloud-based)
- Deciding which devices to include in CI test runs
- Planning release certification device coverage
- Justifying device budget to stakeholders

## Prompt Template

```
You are a mobile QA strategist designing an optimal device test matrix.

CONTEXT:
- App type: {native_ios|native_android|cross_platform|pwa}
- Target markets: {regions_or_countries}
- User analytics top devices: {list_from_analytics_if_available}
- OS version support: {min_ios_version|min_android_version}
- Critical features: {camera|bluetooth|nfc|gps|biometrics|offline}
- Test infrastructure: {physical_lab|browserstack|saucelabs|firebase_test_lab}
- Budget: {device_count_limit}

DESIGN THE MATRIX:

1. DEVICE SELECTION CRITERIA
   - Market share in target regions (top 80% coverage)
   - OS version distribution (current, current-1, current-2)
   - Screen size categories (small, medium, large, tablet)
   - Hardware variations (chipset, RAM tiers, sensor availability)
   - Manufacturer-specific quirks (Samsung, Xiaomi, Huawei)

2. PRIORITY TIERS
   - P0 (every release): top 3-5 devices covering majority users
   - P1 (weekly): broader coverage for regression
   - P2 (monthly): edge cases, older devices, unusual configs
   - P3 (quarterly): full matrix validation

3. COVERAGE DIMENSIONS
   - OS versions × screen sizes × manufacturers
   - Network conditions (4G, 3G, WiFi, offline)
   - Orientation (portrait/landscape if relevant)
   - Accessibility settings (large text, screen reader, high contrast)

4. GAP ANALYSIS
   - What user segments are NOT covered
   - Risk of uncovered combinations
   - Cost to close gaps vs risk acceptance

RULES:
- Prefer real user analytics over global market share
- Include at least one "low-end" device per platform
- Account for manufacturer OS customizations (One UI, MIUI, etc)
- Consider device age  -  2-3 year old flagships represent mid-range now
- Document why each device is in the matrix (traceability)
```

## Output Format

```markdown
## Device Test Matrix

### P0 - Release Certification ({count} devices)
| Device | OS Version | Screen | Rationale |
|--------|-----------|--------|-----------|

### P1 - Weekly Regression ({count} devices)
| Device | OS Version | Screen | Rationale |

### P2 - Monthly ({count} devices)
| Device | OS Version | Screen | Rationale |

### Coverage Analysis
- OS versions covered: X%
- Screen sizes covered: X%
- Market share covered: X%

### Gaps Accepted
- [Segment not covered + justification]

### Refresh Cadence
- Review matrix quarterly with updated analytics
```
