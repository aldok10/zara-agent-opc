---
name: android-kotlin
description: "Android with Kotlin: Jetpack Compose, coroutines, Material 3, Hilt, Gradle KTS"
---

# Android Kotlin

Modern Android development with Kotlin 2.1+, Jetpack Compose 1.7+, Gradle 8.10+, and Material 3.

## Scope

- Jetpack Compose UI (no legacy XML layouts for new screens)
- Kotlin 2.1+ with K2 compiler, context parameters, explicit backing fields
- Coroutines + Flow for async (structured concurrency)
- Hilt for dependency injection
- Material 3 dynamic color and adaptive layouts
- Gradle KTS with version catalogs
- Room/DataStore for persistence, Ktor/Retrofit for network

## First Action

Read `build.gradle.kts` (app module), `libs.versions.toml`, and one existing screen composable to understand project conventions before writing code.

## Constraints

1. Compose-first -- no new XML layouts unless interfacing with legacy views
2. Kotlin 2.0+ features: use data objects, value classes, sealed interfaces
3. State hoisting: UI composables are stateless, state lives in ViewModel
4. Hilt `@HiltViewModel` for all ViewModels -- no manual factory
5. Coroutines: use `viewModelScope`, never `GlobalScope`
6. Flow: expose `StateFlow` from ViewModel, collect with `collectAsStateWithLifecycle`
7. Navigation: type-safe Compose Navigation with serializable routes
8. Material 3 tokens only -- no hardcoded colors or dp outside theme
9. Gradle version catalog (`libs.versions.toml`) for all dependencies
10. Min SDK 26+ unless project specifies otherwise
11. ProGuard/R8 rules updated when adding reflection-based libs
12. Test: JUnit5 + Turbine for Flow + Compose UI testing
13. No `!!` operator -- use `requireNotNull` with message or safe handling
14. Baseline Profiles for startup and critical user journeys
15. Modularize by feature: `:feature:*`, `:core:*`, `:data:*`

## DO NOT

- Use `LiveData` in new code (Flow only)
- Create God Activities -- single Activity + Compose Navigation
- Block main thread with synchronous IO
- Use deprecated `kapt` -- migrate to KSP
- Hardcode strings -- use `stringResource` / string XML
- Skip `@Preview` annotations on composables
- Use `remember` for complex state -- use ViewModel
- Import `android.util.Log` directly -- use Timber or abstraction
- Use `findViewByld` anywhere in new code

## Route to Subskill

| Signal | Route to |
|--------|----------|
| Compose animations/gestures | flutter (shared motion patterns) |
| CI/CD pipeline | engineering-workflow |
| API layer design | system-design |
| Crypto/auth flows | security-engineering |
| Test strategy | testing-strategy |

## Verification

- [ ] `./gradlew build` passes (lint + compile)
- [ ] `./gradlew testDebugUnitTest` green
- [ ] No new lint warnings (`./gradlew lintDebug`)
- [ ] Compose previews render without crash
- [ ] No `kapt` usage -- KSP only
- [ ] Version catalog has no duplicate entries

## Knowledge

- `build.gradle.kts` (project + app module)
- `gradle/libs.versions.toml`
- `app/src/main/**/ui/` (Compose screens)
- `app/src/main/**/di/` (Hilt modules)
- `app/src/test/` (unit tests)

## AI-Era Context (2026)

- K2 compiler is stable and default -- use new type inference capabilities
- Compose Multiplatform shares UI with desktop/iOS in some projects
- Kotlin 2.1 introduces guards in when-expressions -- use when available
- Baseline Profiles + Macrobenchmark are expected for production apps
- Gemini Nano on-device inference available via ML Kit for supported devices

## Related Skills

- `testing-strategy` -- test patterns and coverage
- `system-design` -- offline-first architecture
- `security-engineering` -- keystore, biometrics, certificate pinning
