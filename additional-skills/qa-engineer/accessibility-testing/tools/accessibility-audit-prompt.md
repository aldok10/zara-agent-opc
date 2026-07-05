---
type: tool
title: "Accessibility Audit Workflow"
---

# Accessibility Audit Workflow

## Purpose
Structured workflow for performing a WCAG 2.2 AA compliance audit on a web application or component.

## Inputs Required
- Target URL or component path
- Target WCAG level (default: AA)
- User context (public site, internal app, mobile-first)
- Known exclusions (third-party widgets, legacy sections)

## Audit Steps

### 1. Automated Scan
Run axe-core against target with appropriate tags:
- Configure scope (include/exclude)
- Set rule tags: `['wcag2a', 'wcag2aa', 'wcag22aa']`
- Capture: violations, incomplete, passes count
- Group violations by impact (critical > serious > moderate > minor)

### 2. Keyboard Navigation Audit
Test without mouse:
- [ ] All interactive elements reachable via Tab
- [ ] Tab order follows visual layout
- [ ] Focus indicator visible on every element
- [ ] No keyboard traps (can exit modals, dropdowns)
- [ ] Custom widgets support expected keys (Space, Enter, Arrow)
- [ ] Skip-to-content link present and functional

### 3. Screen Reader Check
Test with VoiceOver (macOS) or NVDA (Windows):
- [ ] Page landmarks announced correctly
- [ ] Headings hierarchy makes sense when listed
- [ ] Images have meaningful alt text (or empty for decorative)
- [ ] Form inputs have associated labels
- [ ] Dynamic content changes announced (live regions)
- [ ] Error messages associated with inputs

### 4. Visual Inspection
- [ ] Color contrast meets 4.5:1 (text) and 3:1 (UI elements)
- [ ] Information not conveyed by color alone
- [ ] Text resizable to 200% without overlap/clipping
- [ ] Content reflows at 320px viewport width
- [ ] Touch targets minimum 24x24px
- [ ] Focus not obscured by sticky elements

### 5. Interaction Patterns
- [ ] Drag operations have click alternatives (2.5.7)
- [ ] No cognitive tests for authentication (3.3.8)
- [ ] Previously entered data not re-requested (3.3.7)
- [ ] Help mechanisms consistent across pages (3.2.6)
- [ ] Motion-triggered actions have alternatives

## Output Format

```markdown
## Accessibility Audit Report

### Summary
- Pages/Components tested: [count]
- Critical violations: [count]
- Serious violations: [count]
- WCAG 2.2 AA compliance: [PASS/FAIL]

### Critical Issues (fix immediately)
| # | Criterion | Description | Location | Impact |
|---|-----------|-------------|----------|--------|

### Serious Issues (fix before release)
| # | Criterion | Description | Location | Impact |

### Moderate Issues (fix in next sprint)
| # | Criterion | Description | Location | Impact |

### Manual Review Needed
- [Items axe flagged as 'incomplete']

### Recommendations
1. [Priority fix with implementation suggestion]
2. [Process improvement]
```

## Severity Criteria
- **Critical**: Blocker for assistive tech users (no keyboard access, no screen reader support)
- **Serious**: Major difficulty for users (poor contrast, missing labels, trap scenarios)
- **Moderate**: Inconvenience but workaround exists (heading skip, redundant entry)
- **Minor**: Best practice deviation (suboptimal but functional)
