---
type: fact
title: "Kotlin Multiplatform Shared Logic (2026)"
---

# Kotlin Multiplatform Shared Logic (2026)

## Architecture

KMP allows sharing business logic between Android and iOS while keeping native UI on each platform.

```
shared/                          # KMP module
├── commonMain/                  # Shared Kotlin code
│   └── kotlin/
│       ├── domain/              # Business rules, entities
│       ├── data/                # Repositories, data sources
│       └── util/                # Shared utilities
├── androidMain/                 # Android-specific implementations
│   └── kotlin/
│       └── platform/            # Android platform bindings
├── iosMain/                     # iOS-specific implementations
│   └── kotlin/
│       └── platform/            # iOS platform bindings
└── commonTest/                  # Shared tests
```

## expect/actual Pattern

Define interfaces in common, implement per-platform:

```kotlin
// commonMain
expect class PlatformContext

expect fun createHttpEngine(): HttpClientEngine

// androidMain
actual typealias PlatformContext = android.content.Context

actual fun createHttpEngine(): HttpClientEngine = OkHttp.create()

// iosMain
actual class PlatformContext(val context: NSObject)

actual fun createHttpEngine(): HttpClientEngine = Darwin.create()
```

## Sharing Business Logic

```kotlin
// commonMain/domain/OrderUseCase.kt
class PlaceOrderUseCase(
    private val orderRepo: OrderRepository,
    private val paymentService: PaymentService,
    private val analytics: Analytics,
) {
    suspend fun execute(cart: Cart, payment: PaymentMethod): Result<Order> {
        val validated = cart.validate() ?: return Result.failure(InvalidCartException())

        val paymentResult = paymentService.charge(payment, validated.total)
        if (paymentResult.isFailure) return paymentResult.map { error("unreachable") }

        val order = orderRepo.create(
            items = validated.items,
            paymentId = paymentResult.getOrThrow().id,
        )

        analytics.track(AnalyticsEvent.OrderPlaced(order.id, validated.total))
        return Result.success(order)
    }
}
```

This logic runs identically on Android and iOS -- only the repository/service implementations differ per platform.

## Coroutines/Flow on iOS

KMP exposes Kotlin coroutines to Swift. SKIE (by Touchlab) generates Swift-friendly wrappers:

```kotlin
// commonMain - exposed to iOS
class OrderViewModel(private val repo: OrderRepository) {
    val orders: StateFlow<List<Order>> = repo.observeOrders()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    suspend fun refresh() { repo.refresh() }
}
```

With SKIE, Swift sees:
```swift
// Auto-generated Swift-friendly API
let orders = viewModel.orders  // AsyncSequence<[Order]>
for await orderList in orders {
    updateUI(orderList)
}
```

Without SKIE, manual wrappers needed:
```kotlin
// commonMain helper
fun <T> Flow<T>.asCallback(scope: CoroutineScope, callback: (T) -> Unit): Cancellable {
    val job = scope.launch { collect { callback(it) } }
    return object : Cancellable { override fun cancel() { job.cancel() } }
}
```

## Networking (Ktor)

```kotlin
// commonMain
class ApiClient(engine: HttpClientEngine) {
    private val client = HttpClient(engine) {
        install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
        install(HttpTimeout) { requestTimeoutMillis = 30_000 }
        defaultRequest { url("https://api.example.com/v1/") }
    }

    suspend fun getOrders(): List<OrderDto> =
        client.get("orders").body()

    suspend fun getOrder(id: String): OrderDto =
        client.get("orders/$id").body()
}
```

## Local Storage (SQLDelight)

```kotlin
// commonMain
class OrderLocalSource(private val db: AppDatabase) {
    fun observeAll(): Flow<List<OrderEntity>> =
        db.orderQueries.selectAll().asFlow().mapToList(Dispatchers.Default)

    suspend fun upsert(orders: List<OrderEntity>) {
        db.transaction {
            orders.forEach { db.orderQueries.upsert(it.id, it.status, it.total, it.updatedAt) }
        }
    }
}
```

SQLDelight generates type-safe Kotlin from SQL, works on both Android (SQLite) and iOS (native SQLite).

## Dependency Injection (Koin)

```kotlin
// commonMain
val sharedModule = module {
    single { createHttpEngine() }
    single { ApiClient(get()) }
    single<OrderRepository> { OrderRepositoryImpl(get(), get()) }
    factory { PlaceOrderUseCase(get(), get(), get()) }
}

// androidMain
val androidModule = module {
    single { AndroidAnalytics(get()) as Analytics }
}

// iosMain
val iosModule = module {
    single { IOSAnalytics() as Analytics }
}
```

## Testing

```kotlin
// commonTest
class PlaceOrderUseCaseTest {
    private val fakeRepo = FakeOrderRepository()
    private val fakePayment = FakePaymentService()
    private val fakeAnalytics = FakeAnalytics()
    private val useCase = PlaceOrderUseCase(fakeRepo, fakePayment, fakeAnalytics)

    @Test
    fun successfulOrder_createsAndTracksOrder() = runTest {
        fakePayment.willSucceed()
        val result = useCase.execute(Cart.sample(), PaymentMethod.card("tok_123"))

        assertTrue(result.isSuccess)
        assertEquals(1, fakeRepo.createdOrders.size)
        assertEquals("OrderPlaced", fakeAnalytics.lastEvent?.name)
    }
}
```

Tests in `commonTest` run on all platforms via `./gradlew allTests`.

## Integration with Native UI

Android: Import shared module directly, inject with Koin/Hilt.
iOS: KMP generates an XCFramework. Integrate via:
- SPM (Swift Package Manager) -- recommended
- CocoaPods -- legacy but works
- Direct framework embedding

```bash
./gradlew :shared:assemblXCFramework
```

## Pitfalls

- Kotlin objects crossing to iOS are reference-counted (not garbage-collected) -- avoid retain cycles
- Swift doesn't see Kotlin generics well -- use concrete types at API boundary
- Coroutines cancellation works differently on iOS (use SKIE for proper Swift cancellation support)
- Binary size: each KMP module adds ~1-3MB to iOS binary
- Build times: Kotlin/Native compilation for iOS is slower than JVM compilation
