# References

## Kotlin Multiplatform (KMP) (10 refs)
- **KMP Documentation** -- https://kotlinlang.org/docs/multiplatform.html -- Official Kotlin Multiplatform docs
- **KMP Getting Started** -- https://kotlinlang.org/docs/multiplatform-get-started.html -- Setup and first shared module
- **expect/actual** -- https://kotlinlang.org/docs/multiplatform-expect-actual.html -- Platform-specific implementations
- **KMP for Mobile** -- https://kotlinlang.org/docs/multiplatform-mobile-getting-started.html -- iOS and Android shared code
- **Compose Multiplatform** -- https://www.jetbrains.com/compose-multiplatform/ -- Shared UI across desktop, web, and mobile
- **Ktor Client** -- https://ktor.io/docs/client-create-multiplatform-application.html -- Multiplatform HTTP client
- **SQLDelight** -- https://cashapp.github.io/sqldelight/2.0.2/multiplatform_sqlite/ -- Multiplatform database
- **KMP Libraries** -- https://github.com/AdrielCafe/KMPLibraries -- Curated list of KMP-compatible libraries
- **Koin for KMP** -- https://insert-koin.io/docs/reference/koin-mp/kmp -- Multiplatform dependency injection
- **KMP Production Apps** -- https://kotlinlang.org/docs/multiplatform-mobile-case-studies.html -- Case studies from production apps

## Decision Frameworks (8 refs)
- **Native vs Cross-Platform** -- https://www.thoughtworks.com/insights/blog/mobile/native-vs-cross-platform-mobile-development -- Decision criteria and trade-offs
- **When to Go Native** -- https://reactnative.dev/docs/other-platforms -- React Native's own guidance on limits
- **Performance Comparison** -- https://medium.com/aspect-ratio/flutter-vs-react-native-vs-native-a-performance-comparison-d3961ac1afdb -- Benchmarking approaches
- **Team Structure Impact** -- https://teamtopologies.com/key-concepts -- How team shape affects platform choice
- **Hybrid Approaches** -- https://ionic.io/resources/articles/ionic-vs-react-native-performance-comparison -- Embedding native in cross-platform
- **Brownfield Integration** -- https://reactnative.dev/docs/integration-with-existing-apps -- Adding cross-platform to existing native apps
- **Build vs Buy** -- https://www.svpg.com/build-vs-buy/ -- When to use cross-platform frameworks
- **Technical Due Diligence** -- https://newsletter.pragmaticengineer.com/p/cross-platform-mobile -- Gergely Orosz on cross-platform decisions

## Shared Logic Patterns (7 refs)
- **Clean Architecture Mobile** -- https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html -- Separating business logic from UI
- **Repository Pattern** -- https://developer.android.com/topic/architecture/data-layer -- Data layer abstraction for sharing
- **Use Cases / Interactors** -- https://proandroiddev.com/why-you-need-use-cases-interactors-142e8a6fe576 -- Encapsulating business rules
- **Shared Networking** -- https://ktor.io/docs/client-create-multiplatform-application.html -- Cross-platform API clients
- **Shared State Management** -- https://github.com/nicklockwood/SwiftFormat -- Patterns for shared state across platforms
- **Feature Flags Cross-Platform** -- https://docs.launchdarkly.com/sdk/client-side/react-native -- Managing features across mobile platforms
- **Shared Testing** -- https://kotlinlang.org/docs/multiplatform-run-tests.html -- Running tests across target platforms

## Platform-Specific Concerns (10 refs)
- **Platform UI Guidelines** -- https://developer.apple.com/design/human-interface-guidelines -- Apple HIG compliance requirements
- **Material Design** -- https://m3.material.io/ -- Google's design system for Android
- **Push Notifications** -- https://firebase.google.com/docs/cloud-messaging -- Cross-platform push with FCM
- **Deep Linking** -- https://developer.android.com/training/app-links -- Platform-specific link handling
- **Biometrics** -- https://developer.apple.com/documentation/localauthentication -- Native biometric APIs
- **Permissions** -- https://developer.android.com/training/permissions/requesting -- Runtime permission patterns
- **App Store Guidelines** -- https://developer.apple.com/app-store/review/guidelines/ -- iOS submission requirements
- **Play Store Policies** -- https://developer.android.com/distribute/play-policies -- Android distribution policies
- **CI/CD for Mobile** -- https://docs.fastlane.tools/ -- Fastlane for build and deployment automation
- **Code Signing** -- https://developer.apple.com/support/code-signing/ -- Certificate and provisioning management
