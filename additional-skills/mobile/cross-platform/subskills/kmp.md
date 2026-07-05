# Kotlin Multiplatform (KMP)

Shared logic architecture, expect/actual mechanism, and integration with native UI layers.

## When to Load

- Sharing business logic between iOS and Android without shared UI
- Implementing expect/actual patterns for platform-specific code
- Setting up KMP project structure and Gradle configuration
- Integrating KMP modules into existing native applications

## Key Concepts

**Architecture**
- Shared module: common Kotlin code (business logic, networking, data)
- Platform-specific: expect/actual declarations for platform APIs
- iOS integration: compiled to framework (via Kotlin/Native)
- Android integration: standard Kotlin library (no overhead)
- UI stays native: SwiftUI/UIKit on iOS, Compose/Views on Android

**expect/actual Mechanism**
- `expect`: declares API in common code (like an interface)
- `actual`: implements it per platform (like concrete implementation)
- Compiler enforces that all expect declarations have actual implementations
- Use for: file system, crypto, date/time, platform APIs

**Source Set Structure**
```
shared/
  src/
    commonMain/     -- shared code (Kotlin)
    commonTest/     -- shared tests
    androidMain/    -- Android-specific implementations
    androidTest/
    iosMain/        -- iOS-specific implementations (Kotlin/Native)
    iosTest/
```

**What to Share**
- Domain models and business rules
- Networking (Ktor client)
- Data persistence (SQLDelight)
- Serialization (kotlinx.serialization)
- State management / ViewModels (limited)

**What to Keep Native**
- UI layer (SwiftUI, Compose)
- Navigation
- Platform-specific features (HealthKit, Widgets)
- Heavy platform APIs (camera, Bluetooth, sensors)

## Patterns

```kotlin
// commonMain: shared repository
class OrderRepository(
    private val api: OrderApi,
    private val db: OrderDatabase,
) {
    suspend fun getOrders(): List<Order> {
        return try {
            val orders = api.fetchOrders()
            db.saveOrders(orders)
            orders
        } catch (e: Exception) {
            db.getCachedOrders()
        }
    }
}

// commonMain: expect declaration
expect class PlatformContext

expect fun createHttpClient(context: PlatformContext): HttpClient

// androidMain: actual implementation
actual typealias PlatformContext = android.content.Context

actual fun createHttpClient(context: PlatformContext): HttpClient {
    return HttpClient(OkHttp) {
        install(ContentNegotiation) { json() }
    }
}

// iosMain: actual implementation
actual class PlatformContext

actual fun createHttpClient(context: PlatformContext): HttpClient {
    return HttpClient(Darwin) {
        install(ContentNegotiation) { json() }
    }
}
```

```kotlin
// SQLDelight for shared database
// commonMain/sqldelight/com/app/Order.sq
CREATE TABLE Order (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
);

selectAll:
SELECT * FROM Order ORDER BY created_at DESC;

insertOrder:
INSERT OR REPLACE INTO Order VALUES (?, ?, ?, ?, ?);
```

## Gotchas

- Kotlin/Native has different memory model -- no shared mutable state across threads
- iOS framework build times are slow -- use SKIE for better Swift interop
- CocoaPods integration can be fragile -- consider SPM or direct framework embedding
- Coroutines on iOS: need explicit scope management (no auto-cancellation)
- Not all Kotlin stdlib features work on Native (reflection is limited)
- Debugging KMP on iOS is harder than native -- breakpoints in Xcode may not map

## Verification

- Shared module compiles for all targets: `./gradlew build`
- Tests pass on all platforms: `./gradlew allTests`
- iOS framework integrates without errors in Xcode project
- expect/actual: no unresolved expect declarations
- Performance: shared code execution time comparable to native equivalent
