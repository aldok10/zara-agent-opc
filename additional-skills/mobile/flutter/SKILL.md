---
name: flutter
description: "Flutter 3.27+, Dart 3.7+, Riverpod 2, go_router, Impeller, freezed"
---

# Flutter

Cross-platform mobile/desktop development with Flutter 3.27+ and Dart 3.7+.

## Scope

- Flutter 3.27+ with Impeller renderer as default
- Dart 3.7+ with patterns, sealed classes, records, macros (experimental)
- Riverpod 2 with code generation (`@riverpod` annotation)
- go_router for type-safe declarative routing
- freezed for immutable data classes and unions
- Platform channels / FFI for performance-critical native code
- Material 3 adaptive widgets

## First Action

Read `pubspec.yaml`, `lib/main.dart`, one feature's provider file, and the router config to understand architecture before writing code.

## Constraints

1. Impeller is the default renderer -- do not disable unless debugging specific rendering bugs
2. Riverpod 2 with code gen: `@riverpod` annotation, no legacy `StateNotifierProvider`
3. go_router type-safe routes: define route classes, no raw string paths
4. Native assets (`@Native` annotations) for FFI - replaces manual `dart:ffi` boilerplate
5. Composition over inheritance -- prefer small widgets composed together
6. freezed for all data classes and sealed unions
7. `dart fix --apply` + `dart format` before every commit
8. Strict analysis: `strict-casts`, `strict-raw-types`, `strict-inference` enabled
9. Feature-first folder structure: `lib/features/{name}/{data,domain,presentation}/`
10. No `setState` in production code -- use Riverpod providers
11. Assets declared in `pubspec.yaml` and loaded via generated constants
12. Platform-adaptive UI: `Platform.isIOS` checks for UX differences
13. Null safety enforced -- no `!` without documented justification
14. Integration tests with `patrol` or `integration_test` package

## DO NOT

- Use `StatefulWidget` with complex logic -- extract to provider
- Use `BLoC` in new code (project standard is Riverpod)
- Disable Impeller unless reproducing a renderer-specific bug
- Use raw string routes -- always type-safe go_router
- Skip `freezed` for data models -- no manual `==`/`hashCode`
- Use `dynamic` type -- always explicit types
- Nest widgets deeper than 4 levels without extracting
- Import `dart:mirrors` (not available in AOT)
- Use `print()` -- use `logger` package or `debugPrint`

## Route to Subskill

| Signal | Route to |
|--------|----------|
| Native module (Kotlin/Swift) | android-kotlin / ios-swift |
| Platform decision making | cross-platform |
| CI/CD pipeline | engineering-workflow |
| API/backend design | system-design |
| Test architecture | testing-strategy |

## Verification

- [ ] `dart analyze` -- zero issues
- [ ] `dart format --set-exit-if-changed .` passes
- [ ] `flutter test` all green
- [ ] `flutter build apk --release` and `flutter build ios --release` succeed
- [ ] No deprecated Riverpod APIs used
- [ ] go_router routes are type-safe (no string literals)

## Knowledge

- `pubspec.yaml` (deps + Flutter version)
- `analysis_options.yaml`
- `lib/main.dart` + `lib/router/`
- `lib/features/` (feature modules)
- `test/` (unit + widget tests)
- `build.yaml` (code gen config)

## AI-Era Context (2026)

- Impeller is production-stable on iOS and Android -- Skia fallback deprecated
- Dart macros (augmentation) replacing some code gen -- watch for stabilization
- Riverpod 3 preview available but 2 with code gen is current stable
- Flutter Web uses WasmGC by default -- same codebase targets web
- Hot reload + AI code suggestions make iteration cycles sub-second
- Flutter GPU API enables custom shaders without native plugins

## Related Skills

- `cross-platform` -- when to use Flutter vs native vs RN
- `testing-strategy` -- widget testing, golden tests, integration
- `android-kotlin` / `ios-swift` -- platform channel implementations
