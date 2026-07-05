---
type: tool
title: "Mobile Test Strategy Prompt"
---

# Mobile Test Strategy Prompt

## Purpose
Design a mobile testing strategy for an app covering devices, automation, and critical flows.

## Inputs Required
- App type (native iOS, native Android, React Native, Flutter, PWA)
- Target audience (demographics, primary devices)
- Key user flows (top 5-10 critical paths)
- Backend dependencies (APIs, push notifications, auth)
- Release cadence (weekly, bi-weekly, monthly)
- Current test infrastructure (if any)

## Strategy Design Steps

### 1. Device Matrix Selection

```markdown
## Device Coverage

### Analytics-Based Selection
- Top 5 devices from user analytics: [list]
- OS version distribution: [breakdown]
- Screen size range: [min] to [max]

### Test Matrix
| Device | OS Version | Screen | Priority | Where |
|--------|-----------|--------|----------|-------|
| [name] | [version] | [size] | P0 | [local/cloud] |
```

### 2. Test Layer Design

```markdown
## Test Architecture

### Unit Tests (70%)
- Framework: [XCTest / JUnit / Jest]
- Coverage target: 80% business logic
- Run: every commit, <2 min

### Integration Tests (20%)
- Framework: [XCUITest / Espresso / Detox]
- Coverage: API integration, navigation, data flow
- Run: every PR, <10 min

### E2E Tests (10%)
- Framework: [Appium / Maestro / Detox]
- Coverage: critical user flows only
- Run: pre-release, <30 min on device farm
```

### 3. Critical Flow Coverage

```markdown
## Critical Flows (must never break)

| # | Flow | Steps | Devices | Frequency |
|---|------|-------|---------|-----------|
| 1 | Onboarding | Install → Sign up → First action | All P0 | Every release |
| 2 | Core action | [app-specific primary flow] | All P0 | Every PR |
| 3 | Payment | Add card → Purchase → Confirm | P0 + P1 | Every release |
| 4 | Push notification | Receive → Tap → Navigate | Representative | Weekly |
| 5 | Offline → Online | Lose connection → Queue → Sync | 1 per platform | Every release |
```

### 4. Automation Framework Choice

```markdown
## Framework Decision

| Criteria | Option A | Option B | Option C |
|----------|----------|----------|----------|
| Platform | [cross-platform?] | [native only?] | |
| Speed | [fast/medium/slow] | | |
| Stability | [flaky/stable] | | |
| Maintenance | [low/medium/high] | | |
| Team skill | [familiar/learning] | | |

### Recommendation: [framework] because [reason]
```

### 5. CI/CD Integration

```markdown
## Pipeline Design

### On Every PR
- [ ] Unit tests (all platforms)
- [ ] Lint + static analysis
- [ ] Build verification (both platforms)
- [ ] Component tests (if applicable)

### On Merge to Main
- [ ] Integration tests on emulators
- [ ] E2E smoke test on 1 real device per platform
- [ ] Performance baseline check

### Pre-Release
- [ ] Full E2E suite on device matrix
- [ ] Manual exploratory testing (focused areas)
- [ ] Accessibility check on P0 devices
- [ ] Performance profiling
```

### 6. Non-Functional Testing

```markdown
## Non-Functional Checklist

### Performance
- [ ] Cold start time < [X]s
- [ ] Screen transitions < 300ms
- [ ] Memory leak detection (navigate 50x loop)
- [ ] Battery baseline (15 min active use)

### Network Conditions
- [ ] Offline start → cached content shown
- [ ] Mid-request disconnect → graceful error
- [ ] Slow network (3G) → loading states visible
- [ ] Network recovery → pending operations sync

### Security
- [ ] Data at rest encrypted
- [ ] Certificate pinning verified
- [ ] No sensitive data in logs
- [ ] Biometric auth bypass impossible

### Accessibility
- [ ] VoiceOver/TalkBack navigable
- [ ] Dynamic text sizes respected
- [ ] Touch targets >= 44pt (iOS) / 48dp (Android)
```

## Output Format

```markdown
## Mobile Test Strategy: [App Name]

### Summary
- Platform: [iOS/Android/Both]
- Framework: [chosen]
- Device farm: [provider]
- Estimated setup time: [X days]

### Device Matrix
[table]

### Test Layers
[breakdown with counts]

### Critical Flows
[prioritized list]

### CI/CD Pipeline
[diagram or steps]

### Estimated Costs
- Device farm: [$X/month]
- CI minutes: [$X/month]
- Maintenance: [X hours/week]
```
