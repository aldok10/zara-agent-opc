package com.example.orders.data

import com.example.orders.data.local.OrderDao
import com.example.orders.data.local.OrderEntity
import com.example.orders.data.remote.OrderApi
import com.example.orders.domain.Order
import com.example.orders.domain.OrderRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class OrderRepositoryImpl @Inject constructor(
    private val api: OrderApi,
    private val dao: OrderDao
) : OrderRepository {

    override fun observeOrders(): Flow<List<Order>> =
        dao.observeAll().map { entities -> entities.map { it.toDomain() } }

    override fun observeOrder(id: String): Flow<Order?> =
        dao.observeById(id).map { it?.toDomain() }

    override suspend fun refreshOrders() {
        val remote = api.fetchOrders()
        val entities = remote.map { it.toEntity() }
        dao.upsertAll(entities)
    }

    override suspend fun refreshOrder(id: String) {
        val remote = api.fetchOrder(id)
        dao.upsert(remote.toEntity())
    }
}

private fun OrderEntity.toDomain(): Order = Order(
    id = id,
    status = Order.Status.fromString(status),
    total = total,
    createdAt = createdAt,
    items = items
)

private fun com.example.orders.data.remote.OrderDto.toEntity(): OrderEntity = OrderEntity(
    id = id,
    status = status,
    total = total,
    createdAt = createdAt,
    items = items
)
