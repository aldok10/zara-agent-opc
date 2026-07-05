---
type: fact
title: "Cross-Platform Decision Matrix (2026)"
---

# Cross-Platform Decision Matrix (2026)

## When to Choose Each Approach

### Native (Kotlin/Swift) -- Choose When:

- Platform-specific UX is the primary differentiator (camera apps, AR, custom gestures)
- Deep OS integration required (widgets, extensions, shortcuts, system APIs)
- Team has strong native expertise and dedicated platform engineers
- App is compute-heavy with real-time requirements (games, video editing, audio processing)
- Regulatory requirements mandate platform-specific behavior (banking, healthcare)
- Budget allows 2x development cost for optimal UX
- App has <5 shared screens between platforms

Score weight: UX fidelity (5/5), Performance (5/5), Dev cost (1/5), Time to market (2/5)

### Flutter -- Choose When:

- Pixel-perfect custom UI across platforms (same visuals on both)
- Team is small (3-8 devs) and needs single codebase
- Product-led company where UI consistency matters more than native feel
- Targeting beyond mobile (web, desktop, embedded)
- Performance requirements are moderate-to-high (60fps animations, complex scrolling)
- Startup with limited runway needs fast iteration on both platforms
- Strong Dart/Flutter expertise available (or team willing to learn)

Score weight: UX fidelity (4/5), Performance (4/5), Dev cost (4/5), Time to market (4/5)

### React Native -- Choose When:

- Team has strong web/React expertise
- Existing web app with shared business logic (TypeScript reuse)
- OTA update capability needed (Expo EAS Update, CodePush)
- Large ecosystem of JS libraries needed
- App is primarily data-display with standard navigation patterns
- Need to integrate into existing native apps (brownfield)
- Rapid prototyping with quick iteration cycles

Score weight: UX fidelity (3.5/5), Performance (3.5/5), Dev cost (4/5), Time to market (5/5)

### KMP (Kotlin Multiplatform) -- Choose When:

- Native UI on each platform but shared business logic
- Existing Android app with Kotlin that needs iOS parity
- Complex domain logic (offline sync, crypto, ML inference) that shouldn't be duplicated
- Team has Kotlin expertise and wants native UI feel on both platforms
- Gradual migration from native Android to shared code

Score weight: UX fidelity (5/5), Performance (5/5), Dev cost (3/5), Time to market (3/5)

## Decision Flowchart

```
START
  |
  v
Custom rendering/game? --> YES --> Native or Unity/Unreal
  |
  NO
  |
  v
Pixel-identical UI on both platforms? --> YES --> Flutter
  |
  NO
  |
  v
Existing React/TS team + web app? --> YES --> React Native (Expo)
  |
  NO
  |
  v
Native UI + shared logic? --> YES --> KMP
  |
  NO
  |
  v
Platform-specific UX critical? --> YES --> Native
  |
  NO
  |
  v
Team size < 5? --> YES --> Flutter or React Native (based on expertise)
  |
  NO
  |
  v
Evaluate: team skills, timeline, budget, target platforms
```

## Performance Comparison (realistic 2026 benchmarks)

| Metric | Native | Flutter | React Native | KMP |
|--------|--------|---------|--------------|-----|
| Cold start (ms) | 200-400 | 300-500 | 400-700 | 200-400 |
| List scroll (fps) | 60 | 58-60 | 55-60 | 60 |
| Animation jank | Rare | Rare (Impeller) | Rare (Reanimated 3) | Rare |
| Memory baseline (MB) | 30-50 | 50-80 | 60-100 | 30-50 |
| Binary size overhead | 0 | +5-10MB | +7-15MB | +1-3MB |
| Hot reload | Build (seconds) | Sub-second | Sub-second | Build (seconds) |

## Hidden Costs to Consider

**Flutter**:
- Custom platform UI (date pickers, share sheets) requires extra work
- Debugging platform-specific issues needs Xcode/Android Studio knowledge
- Plugin quality varies -- check pub.dev scores carefully

**React Native**:
- Native module bridging for unavailable features
- Hermes engine quirks (different from V8/JSC in edge cases)
- Upgrade path between RN versions historically painful (improving with Expo)

**KMP**:
- iOS-specific IDE support still maturing (Xcode integration via SKIE/KMP plugin)
- Coroutines/Flow interop with Swift async requires adapters
- Smaller community than Flutter/RN for shared libraries

**Native**:
- 2x feature development cost (or more with divergent platform features)
- Keeping parity between platforms requires disciplined planning
- Separate CI/CD pipelines and testing infrastructure

## Team Composition Recommendations

| Approach | Min Team | Recommended |
|----------|----------|-------------|
| Native (both) | 4 (2+2) | 6-8 (3+3 + shared) |
| Flutter | 2 | 4-6 |
| React Native | 2 | 4-6 |
| KMP + Native UI | 3 | 5-7 |
