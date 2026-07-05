# Swift Concurrency (2026)

## Actors

Actors provide data-race safety through serial access to mutable state.

```swift
actor SessionManager {
    private var tokens: [String: AuthToken] = [:]

    func token(for userId: String) async throws -> AuthToken {
        if let existing = tokens[userId], !existing.isExpired {
            return existing
        }
        let fresh = try await authService.refresh(userId: userId)
        tokens[userId] = fresh
        return fresh
    }

    func invalidate(userId: String) {
        tokens.removeValue(forKey: userId)
    }
}
```

Key behaviors:
- All methods are implicitly isolated -- callers must `await`
- `nonisolated` keyword for read-only computed properties or Sendable returns
- Actor reentrancy: suspension points allow other calls to interleave -- check state AFTER await
- `@MainActor` for UI-bound types (ViewModels, UI coordinators)

### Global Actors

```swift
@MainActor
@Observable
class CartViewModel {
    var items: [CartItem] = []

    func add(_ product: Product) async {
        let item = await cartService.add(product) // hops off MainActor
        items.append(item) // back on MainActor automatically
    }
}
```

### Sendable

Types that cross actor boundaries must conform to `Sendable`:
- Value types (struct, enum) with Sendable properties are implicitly Sendable
- Classes: mark `final class` + immutable properties, or use `@unchecked Sendable` with manual sync
- Closures: `@Sendable` ensures no mutable capture

Swift 6 enforces Sendable checking strictly -- plan for it in new code.

## Structured Concurrency

### TaskGroup

```swift
func fetchDashboard() async throws -> Dashboard {
    async let profile = profileService.fetch()
    async let orders = orderService.fetchRecent()
    async let notifications = notificationService.unread()

    return try await Dashboard(
        profile: profile,
        orders: orders,
        notifications: notifications
    )
}
```

For dynamic parallelism:
```swift
func fetchImages(urls: [URL]) async throws -> [UIImage] {
    try await withThrowingTaskGroup(of: (Int, UIImage).self) { group in
        for (index, url) in urls.enumerated() {
            group.addTask { (index, try await ImageLoader.load(url)) }
        }
        var results = [(Int, UIImage)]()
        for try await result in group { results.append(result) }
        return results.sorted(by: { $0.0 < $1.0 }).map(\.1)
    }
}
```

### Task cancellation

```swift
func pollStatus(orderId: String) async throws -> OrderStatus {
    while !Task.isCancelled {
        let status = try await api.checkStatus(orderId)
        if status.isFinal { return status }
        try await Task.sleep(for: .seconds(2))
    }
    throw CancellationError()
}
```

Always check `Task.isCancelled` or use `try Task.checkCancellation()` in loops.

## AsyncSequence

```swift
struct PriceStream: AsyncSequence {
    typealias Element = Price
    let ticker: String

    func makeAsyncIterator() -> PriceIterator {
        PriceIterator(ticker: ticker)
    }
}

// More commonly, use AsyncStream:
func priceUpdates(ticker: String) -> AsyncStream<Price> {
    AsyncStream { continuation in
        let socket = WebSocket(url: priceURL(ticker))
        socket.onMessage = { data in
            if let price = Price(data: data) {
                continuation.yield(price)
            }
        }
        socket.onClose = { continuation.finish() }
        continuation.onTermination = { _ in socket.disconnect() }
        socket.connect()
    }
}
```

Consuming:
```swift
for await price in priceUpdates(ticker: "AAPL") {
    updateChart(price)
}
```

Operators (available via AsyncAlgorithms package):
- `debounce(for:)`, `throttle(for:)`
- `merge()`, `chain()`
- `compactMap()`, `filter()`, `prefix()`

## Error Handling Patterns

```swift
enum AppError: Error, Sendable {
    case network(underlying: Error)
    case unauthorized
    case notFound
    case server(statusCode: Int)

    init(from error: Error) {
        if let urlError = error as? URLError {
            self = .network(underlying: urlError)
        } else {
            self = .network(underlying: error)
        }
    }
}
```

Pattern: typed errors at domain boundary, general Error at infra layer.

## Testing Async Code

```swift
@Test func loadProfile_success() async throws {
    let service = MockProfileService(result: .success(.sample))
    let vm = ProfileViewModel(service: service)

    await vm.load()

    #expect(vm.profile == .sample)
    #expect(vm.isLoading == false)
}

@Test func loadProfile_cancellation() async {
    let task = Task { await vm.load() }
    task.cancel()
    // Verify cleanup happened
}
```

Use Swift Testing framework (`@Test`, `#expect`) for new test code (replaces XCTest assertions).
