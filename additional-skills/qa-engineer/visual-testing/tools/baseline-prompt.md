---
type: tool
title: "Visual Baseline Management Prompt"
---

# Visual Baseline Management Prompt

## Purpose
Define a visual testing baseline strategy including when to update, how to review changes, and how to avoid flaky comparisons.

## When to Use
- Setting up visual regression testing for the first time
- Defining process for updating baselines after intentional UI changes
- Reducing false positives in visual diff results
- Training team on visual test review workflows

## Prompt Template

```
You are a visual testing specialist designing baseline management strategy.

CONTEXT:
- Visual testing tool: {chromatic|percy|applitools|playwright_screenshots|backstopjs}
- Component count: {approximate_number_of_visual_tests}
- UI change frequency: {daily|weekly|occasional}
- Team reviewing diffs: {design|engineering|both}
- CI integration: {where_visual_tests_run}
- Environments: {storybook|staging|production_shadow}

DESIGN THE BASELINE STRATEGY:

1. BASELINE CAPTURE RULES
   - Which states to capture per component (default, hover, focus, error, loading, empty)
   - Viewport sizes to baseline (mobile, tablet, desktop)
   - Theme variants (light, dark, high contrast)
   - Browser matrix (Chrome, Firefox, Safari  -  which are canonical)
   - Data variations (short text, long text, missing data)

2. UPDATE WORKFLOW
   - Who can approve baseline updates (designer sign-off required?)
   - PR-based review: visual diff attached to PR
   - Batch updates: how to handle design system upgrades
   - Emergency updates: broken baseline blocking unrelated PRs

3. FLAKY TEST PREVENTION
   - Anti-aliasing tolerance thresholds
   - Ignore regions for dynamic content (timestamps, avatars, ads)
   - Font rendering consistency (web fonts loaded before capture)
   - Animation handling (disable or wait for idle)
   - Responsive timing (wait for layout stabilization)

4. REVIEW PROCESS
   - Intentional change: verify matches design spec, approve
   - Unintentional change: flag as regression, block merge
   - Unclear change: escalate to designer
   - Batch review: grouping related diffs for efficient review

5. STORAGE AND PERFORMANCE
   - Baseline branching strategy (per branch vs shared main)
   - Retention policy (keep history for N releases)
   - Parallel capture for speed
   - Selective runs (only test changed components)

RULES:
- Baselines should represent intended design, not "whatever is deployed"
- Every baseline update needs a reason (linked to ticket/decision)
- Pixel-perfect is not the goal  -  catching unintended regressions is
- False positives erode trust faster than missed bugs
```

## Output Format

```markdown
## Visual Baseline Strategy

### Capture Matrix
| Component Category | States | Viewports | Browsers |
|-------------------|--------|-----------|----------|

### Update Process
1. PR changes UI → visual diff generated
2. Review by: {role}
3. Approve/reject with reason
4. Baseline updated on merge to main

### Flakiness Controls
| Issue | Mitigation |
|-------|-----------|

### CI Configuration
[Tool-specific config for stable captures]

### Team Agreements
- Baseline approver: {role}
- Review SLA: {time}
- Escalation path: {process}
```
