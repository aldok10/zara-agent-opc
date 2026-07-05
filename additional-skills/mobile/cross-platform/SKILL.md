---
name: cross-platform
description: "Cross-platform strategy: Flutter vs RN vs native, KMP shared logic, platform-specific UI"
---

# Cross-Platform Strategy

Decision framework for mobile platform selection and shared code architecture.

## Scope

- Platform selection: Flutter vs React Native vs native (Android/iOS)
- Kotlin Multiplatform (KMP) for shared business logic
- Platform-specific UI vs shared UI trade-offs
- Code sharing strategies and boundaries
- Team composition and hiring considerations
- Performance characteristics per approach

## First Action

Identify the project's requirements: team skills, performance needs, platform-specific API usage, timeline, and long-term maintenance plan. Read existing codebase structure if migrating.

## Constraints

1. Decision based on data: team size, skills, timeline, feature requirements
2. KMP for shared business logic when teams know Kotlin -- network, validation, state
3. UI stays platform-native or framework-native -- never share UI across incompatible paradigms
4. Performance-critical paths (camera, AR, real-time audio) favor native
5. Startup/MVP with small team and standard UI: Flutter or RN
6. Enterprise with existing native teams: KMP shared logic + native UI
7. Evaluate: hire-ability of devs, library ecosystem maturity, update cadence
8. Never mix Flutter and RN in same app -- pick one framework
9. Shared code boundary: domain + data layers shared, presentation layer per platform
10. Platform features (widgets, extensions, watch apps) always native
11. Consider maintenance horizon: 1yr prototype vs 5yr product changes the answer
12. Test shared logic independently from platform -- shared tests in KMP/shared module

## DO NOT

- Recommend cross-platform by default -- evaluate each case
- Share UI code when platforms have fundamentally different UX paradigms
- Use KMP for UI layer -- it's for business logic
- Ignore team expertise -- a Swift team forced into Flutter ships slower
- Assume "write once run anywhere" -- it's "write once adapt everywhere"
- Pick technology based on hype -- pick based on constraints
- Forget platform-specific accessibility requirements differ
- Mix multiple cross-platform solutions (no Flutter + RN + KMP UI)

## Route to Subskill

| Signal | Route to |
|--------|----------|
| Decided on Flutter | flutter |
| Decided on React Native | react-native |
| Decided on native Android | android-kotlin |
| Decided on native iOS | ios-swift |
| Architecture patterns | system-design |
| Team structure decisions | career-leadership |

## Decision Matrix

| Factor | Native | Flutter | React Native | KMP + Native UI |
|--------|--------|---------|--------------|-----------------|
| Platform API access | Full | Plugin-based | TurboModule | Full (native UI) |
| UI fidelity | Best | Good (custom) | Good (native) | Best |
| Code sharing | None | 90%+ | 85%+ | 60-70% logic |
| Team requirement | iOS + Android | Dart | React/TS | Kotlin + native |
| Startup speed | Slow | Fast | Fast | Medium |
| Long-term maintenance | Highest cost | Medium | Medium | Medium-high |
| Performance ceiling | Highest | High (Impeller) | High (JSI) | Highest |

## Verification

- [ ] Decision documented with rationale tied to project constraints
- [ ] Team capability assessment completed
- [ ] Performance requirements mapped to framework capabilities
- [ ] Platform-specific features identified and routing planned
- [ ] Shared vs platform-specific code boundaries defined
- [ ] 6-month and 2-year maintenance scenarios considered

## Knowledge

- Project requirements doc or PRD
- Team composition and skills inventory
- Existing codebase structure (if migration)
- Platform-specific feature requirements list
- Performance benchmarks for target use cases

## AI-Era Context (2026)

- KMP is stable (Kotlin 2.1+) and adopted by major companies for shared logic
- Flutter Impeller closes the performance gap with native rendering
- React Native New Architecture (bridgeless) eliminates historical perf issues
- Compose Multiplatform (JetBrains) shares Compose UI across Android/iOS/Desktop
- Compose Multiplatform 1.7+ shares UI across Android/iOS/Desktop
- AI code assistants reduce boilerplate cost -- less reason to share UI just to reduce code
- App Clips (iOS) and Instant Apps (Android) require native entry points regardless
- Swift 6 + Kotlin 2.1 interop improving via shared protocols

## Related Skills

- `flutter` -- Flutter implementation details
- `react-native` -- React Native implementation details
- `android-kotlin` -- Native Android development
- `ios-swift` -- Native iOS development
- `system-design` -- architecture for shared modules
