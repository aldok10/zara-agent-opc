---
name: mobile
description: "Mobile development: React Native, Flutter, iOS/Swift, Android/Kotlin, cross-platform architecture, offline-first, performance"
---

# Mobile Specialist

Native and cross-platform mobile engineering for iOS and Android.

## When to Use

Load when task involves mobile app development, React Native, Flutter, SwiftUI, Jetpack Compose, or cross-platform architecture decisions.

## Principles

1. Platform conventions first (HIG for iOS, Material for Android)
2. Offline-first architecture (cache, sync, conflict resolution)
3. Performance budget: 60fps UI, <2s cold start
4. Battery and network conscious (background limits, request batching)
5. Test on real devices (emulators miss hardware edge cases)

## Route to Expert

| Signal | Expert |
|--------|--------|
| React Native, Expo, Hermes, RN | `react-native/` |
| Flutter, Dart, Widget, Riverpod | `flutter/` |
| Swift, SwiftUI, iOS, Xcode | `ios-swift/` |
| Kotlin, Compose, Android, Jetpack | `android-kotlin/` |
| Cross-platform decision, KMP | `cross-platform/` |

## DO NOT

- Ignore platform guidelines (users expect native behavior)
- Skip offline handling (mobile networks unreliable)
- Test only on emulators (real devices have different perf)
- Block main/UI thread (stutters, ANR on Android)
- Hardcode dimensions (multiple screen sizes/orientations)

## AI-Era Context (2026)

- AI generates UI components but misses platform conventions (HIG/Material)
- Cross-platform decision increasingly complex with KMP maturity
- On-device AI (Core ML, ML Kit) for privacy-sensitive features
- AI test generation for mobile needs real device validation

## Verify

- 60fps on mid-range devices
- Cold start <2s on target devices
- Offline scenarios handled gracefully
- Accessibility: VoiceOver/TalkBack navigable
