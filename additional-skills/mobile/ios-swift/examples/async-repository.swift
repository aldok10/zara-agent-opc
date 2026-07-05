import Foundation

protocol OrderRepository: Sendable {
    func fetchOrders() async throws -> [Order]
    func fetchOrder(id: Order.ID) async throws -> Order
    func ordersStream() -> AsyncStream<[Order]>
}

actor OrderRepositoryImpl: OrderRepository {
    private let apiClient: APIClient
    private let cache: OrderCache
    private let decoder = JSONDecoder()

    init(apiClient: APIClient, cache: OrderCache) {
        self.apiClient = apiClient
        self.cache = cache
        decoder.dateDecodingStrategy = .iso8601
    }

    func fetchOrders() async throws -> [Order] {
        let cached = await cache.allOrders()
        if let cached, !cached.isStale {
            return cached.orders
        }

        let data = try await apiClient.get("/orders")
        let dtos = try decoder.decode([OrderDTO].self, from: data)
        let orders = dtos.map(\.toDomain)

        await cache.store(orders: orders)
        return orders
    }

    func fetchOrder(id: Order.ID) async throws -> Order {
        let data = try await apiClient.get("/orders/\(id.rawValue)")
        let dto = try decoder.decode(OrderDTO.self, from: data)
        let order = dto.toDomain

        await cache.store(order: order)
        return order
    }

    func ordersStream() -> AsyncStream<[Order]> {
        AsyncStream { continuation in
            let task = Task {
                while !Task.isCancelled {
                    do {
                        let orders = try await fetchOrders()
                        continuation.yield(orders)
                    } catch {
                        // yield nothing on error, retry after interval
                    }
                    try? await Task.sleep(for: .seconds(30))
                }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }
}

private struct OrderDTO: Decodable {
    let id: String
    let status: String
    let total: Decimal
    let createdAt: Date
    let items: [OrderItemDTO]

    var toDomain: Order {
        Order(
            id: Order.ID(rawValue: id),
            status: Order.Status(rawValue: status) ?? .unknown,
            total: total,
            createdAt: createdAt,
            items: items.map(\.toDomain)
        )
    }
}

private struct OrderItemDTO: Decodable {
    let productId: String
    let name: String
    let quantity: Int
    let price: Decimal

    var toDomain: OrderItem {
        OrderItem(
            productId: productId,
            name: name,
            quantity: quantity,
            price: price
        )
    }
}

actor OrderCache {
    private var orders: CachedValue<[Order]>?
    private var orderMap: [Order.ID: Order] = [:]
    private let ttl: Duration = .seconds(300)

    func allOrders() -> CachedValue<[Order]>? { orders }

    func store(orders: [Order]) {
        self.orders = CachedValue(orders: orders, fetchedAt: .now)
        for order in orders {
            orderMap[order.id] = order
        }
    }

    func store(order: Order) {
        orderMap[order.id] = order
    }

    struct CachedValue<T> {
        let orders: T
        let fetchedAt: ContinuousClock.Instant
        var isStale: Bool { ContinuousClock.now - fetchedAt > Duration.seconds(300) }
    }
}
