---
type: fact
title: "The Composable Architecture (TCA) Patterns (2026)"
---

# The Composable Architecture (TCA) Patterns (2026)

## Core Concepts

TCA (by Point-Free) provides unidirectional data flow with exhaustive testing. Current version uses `@Reducer` macro.

```swift
@Reducer
struct OrderFeature {
    @ObservableState
    struct State: Equatable {
        var orders: IdentifiedArrayOf<Order> = []
        var isLoading = false
        @Presents var detail: OrderDetailFeature.State?
    }

    enum Action {
        case onAppear
        case ordersLoaded(Result<[Order], Error>)
        case orderTapped(Order.ID)
        case detail(PresentationAction<OrderDetailFeature.Action>)
    }

    @Dependency(\.orderClient) var orderClient

    var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {
            case .onAppear:
                state.isLoading = true
                return .run { send in
                    await send(.ordersLoaded(Result {
                        try await orderClient.fetchAll()
                    }))
                }
            case let .ordersLoaded(.success(orders)):
                state.isLoading = false
                state.orders = IdentifiedArray(uniqueElements: orders)
                return .none
            case let .ordersLoaded(.failure):
                state.isLoading = false
                return .none
            case let .orderTapped(id):
                guard let order = state.orders[id: id] else { return .none }
                state.detail = OrderDetailFeature.State(order: order)
                return .none
            case .detail:
                return .none
            }
        }
        .ifLet(\.$detail, action: \.detail) {
            OrderDetailFeature()
        }
    }
}
```

## Reducers

Composition patterns:
- `Reduce { }` -- primary logic
- `.ifLet(\.$child, action: \.child) { ChildReducer() }` -- optional child state
- `.forEach(\.items, action: \.items) { ItemReducer() }` -- collection of child states
- `Scope(state: \.child, action: \.child) { ChildReducer() }` -- non-optional embedded state

## Effects

Effects are the only way to perform side effects (network, disk, timers).

```swift
// Fire-and-forget
return .run { _ in
    await analytics.track(.screenViewed("orders"))
}

// Cancellation
return .run { send in
    for await status in orderClient.statusStream(orderId) {
        await send(.statusUpdated(status))
    }
}
.cancellable(id: CancelID.statusStream, cancelInFlight: true)

// Debounce
case let .searchChanged(query):
    state.query = query
    return .run { send in
        try await Task.sleep(for: .milliseconds(300))
        let results = try await searchClient.search(query)
        await send(.searchResults(results))
    }
    .cancellable(id: CancelID.search, cancelInFlight: true)

// Merge multiple effects
return .merge(
    .send(.startLoading),
    .run { send in /* fetch */ }
)
```

## Dependencies

```swift
struct OrderClient: Sendable {
    var fetchAll: @Sendable () async throws -> [Order]
    var statusStream: @Sendable (Order.ID) -> AsyncStream<OrderStatus>
}

extension OrderClient: DependencyKey {
    static let liveValue = OrderClient(
        fetchAll: { try await APIService.shared.get("/orders") },
        statusStream: { id in WebSocketService.stream(for: id) }
    )
    static let testValue = OrderClient(
        fetchAll: unimplemented(),
        statusStream: unimplemented()
    )
}

extension DependencyValues {
    var orderClient: OrderClient {
        get { self[OrderClient.self] }
        set { self[OrderClient.self] = newValue }
    }
}
```

## Testing

TCA's `TestStore` provides exhaustive assertion testing:

```swift
@Test func loadOrders() async {
    let store = TestStore(initialState: OrderFeature.State()) {
        OrderFeature()
    } withDependencies: {
        $0.orderClient.fetchAll = { [Order.sample] }
    }

    await store.send(.onAppear) {
        $0.isLoading = true
    }
    await store.receive(\.ordersLoaded.success) {
        $0.isLoading = false
        $0.orders = [Order.sample]
    }
}
```

TestStore enforces:
- Every state mutation must be explicitly asserted
- Every received effect action must be handled
- No unfinished effects when test completes (or use `store.skipInFlightEffects()`)

## View Integration

```swift
struct OrderListView: View {
    @Bindable var store: StoreOf<OrderFeature>

    var body: some View {
        List(store.orders) { order in
            Button(order.title) { store.send(.orderTapped(order.id)) }
        }
        .onAppear { store.send(.onAppear) }
        .sheet(item: $store.scope(state: \.detail, action: \.detail)) { detailStore in
            OrderDetailView(store: detailStore)
        }
    }
}
```
