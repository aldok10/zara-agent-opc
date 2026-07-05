---
name: ios-swift
description: "iOS with Swift: SwiftUI, Swift 6 concurrency, Swift Data, TCA"
---

# iOS Swift

Native iOS development with Swift 6+, SwiftUI, and structured concurrency.

## Scope

- SwiftUI for all new UI (UIKit only for legacy integration)
- Swift 6 strict concurrency: actors, `Sendable`, structured task groups
- Swift Data for persistence (Core Data only in legacy code)
- The Composable Architecture (TCA) for state management
- Swift Package Manager for dependencies
- Xcode 16+ and iOS 18+ target minimum

## First Action

Read `Package.swift` or `.xcodeproj` dependencies, one existing Feature reducer (TCA), and the app's navigation structure before writing code.

## Constraints

1. SwiftUI-first -- no new UIKit views unless wrapping unavailable system APIs
2. Swift 6 strict concurrency mode enabled -- no data races
3. TCA `@Reducer` macro for feature logic -- effects return `Effect<Action>`
4. Actors for shared mutable state outside of TCA stores
5. `@Observable` macro (Observation framework) for non-TCA view models
6. Swift Data `@Model` for persistence -- no raw Core Data in new features
7. Navigation: TCA tree-based navigation or `NavigationStack` with path
8. Structured concurrency: `TaskGroup`, `async let` -- no raw `Task.detached` unless isolated
9. Dependencies via TCA `@Dependency` or Swift Package injection
10. SPM only -- no CocoaPods or Carthage in new projects
11. Previews: every view has `#Preview` with mock dependencies
12. Strict `Sendable` conformance -- no `@unchecked Sendable` without comment
13. Use `@Sendable` closures and `sending` parameter ownership to satisfy concurrency safety
14. Swift Testing framework (`@Test`, `@Suite`) for new test code - XCTest only for legacy or UI tests
15. Minimum deployment target iOS 18 unless specified (iOS 17 is the floor for backward compat -- Observable, SwiftData, TipKit available there)

## DO NOT

- Use `DispatchQueue` directly -- use Swift concurrency
- Force unwrap (`!`) without `preconditionFailure` justification
- Use singletons for dependency injection
- Create massive view bodies -- extract subviews at 30+ lines
- Use `@StateObject` -- prefer `@State` with `@Observable`
- Skip accessibility labels on interactive elements
- Use `AnyView` type erasure -- use `@ViewBuilder` or generics
- Import UIKit for layout -- only for system API bridging

## Route to Subskill

| Signal | Route to |
|--------|----------|
| Shared logic with Android | cross-platform |
| CI/CD (Fastlane, Xcode Cloud) | engineering-workflow |
| Keychain/biometric auth | security-engineering |
| API client design | system-design |
| Test doubles and coverage | testing-strategy |

## Verification

- [ ] `swift build` or Xcode build succeeds with zero warnings
- [ ] All tests pass (`swift test` or Xcode test)
- [ ] Strict concurrency: no sendability warnings
- [ ] SwiftUI previews render
- [ ] No force unwraps without justification
- [ ] Accessibility audit passes in Xcode

## Knowledge

- `Package.swift` or `project.pbxproj`
- `Sources/**/Feature*.swift` (TCA reducers)
- `Sources/**/Views/` (SwiftUI views)
- `Tests/` (unit + snapshot tests)
- `.swiftlint.yml` if present

## AI-Era Context (2026)

- Swift 6.1 fully enforces `Sendable` -- strict concurrency is non-negotiable
- TCA 2.0 with `@Reducer` macro is the standard pattern
- Swift Data replaces Core Data for new projects
- On-device Core ML inference via Swift async APIs
- Xcode predictive code completion works best with well-typed code
- visionOS shares SwiftUI -- write spatial-ready layouts when relevant

## Related Skills

- `cross-platform` -- when sharing logic via KMP or deciding native vs shared
- `testing-strategy` -- TCA reducer testing patterns
- `security-engineering` -- Keychain, App Attest, biometric flows
