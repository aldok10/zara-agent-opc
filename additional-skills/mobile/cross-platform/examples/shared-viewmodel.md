---
type: example
title: "KMP Shared ViewModel (iOS + Android)"
---

# KMP Shared ViewModel (iOS + Android)

## Context
When building a Kotlin Multiplatform app where business logic and state management should be shared between iOS and Android, but the UI layer remains native (SwiftUI/Jetpack Compose). This pattern puts the ViewModel in shared code with platform-specific lifecycle integration.

## Code/Template

```kotlin
// shared/src/commonMain/kotlin/com/app/feature/orders/OrderListViewModel.kt
package com.app.feature.orders

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class Order(
    val id: String,
    val title: String,
    val total: Long, // cents
    val status: OrderStatus,
    val createdAt: Long, // epoch millis
)

enum class OrderStatus { PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED }

data class OrderListState(
    val orders: List<Order> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val filter: OrderStatus? = null,
)

sealed interface OrderListEvent {
    data object Refresh : OrderListEvent
    data class FilterByStatus(val status: OrderStatus?) : OrderListEvent
    data class CancelOrder(val orderId: String) : OrderListEvent
}

class OrderListViewModel(
    private val orderRepository: OrderRepository,
    private val scope: CoroutineScope,
) {
    private val _state = MutableStateFlow(OrderListState())
    val state: StateFlow<OrderListState> = _state.asStateFlow()

    init {
        loadOrders()
    }

    fun onEvent(event: OrderListEvent) {
        when (event) {
            is OrderListEvent.Refresh -> loadOrders()
            is OrderListEvent.FilterByStatus -> filterOrders(event.status)
            is OrderListEvent.CancelOrder -> cancelOrder(event.orderId)
        }
    }

    private fun loadOrders() {
        scope.launch {
            _state.update { it.copy(isLoading = true, error = null) }

            orderRepository.getOrders()
                .onSuccess { orders ->
                    _state.update { state ->
                        state.copy(
                            orders = applyFilter(orders, state.filter),
                            isLoading = false,
                        )
                    }
                }
                .onFailure { error ->
                    _state.update {
                        it.copy(isLoading = false, error = error.message)
                    }
                }
        }
    }

    private fun filterOrders(status: OrderStatus?) {
        _state.update { state ->
            state.copy(
                filter = status,
                orders = applyFilter(state.orders, status),
            )
        }
    }

    private fun cancelOrder(orderId: String) {
        scope.launch {
            orderRepository.cancelOrder(orderId)
                .onSuccess { loadOrders() }
                .onFailure { error ->
                    _state.update { it.copy(error = error.message) }
                }
        }
    }

    private fun applyFilter(orders: List<Order>, status: OrderStatus?): List<Order> {
        return if (status == null) orders else orders.filter { it.status == status }
    }
}
```

```kotlin
// shared/src/commonMain/kotlin/com/app/feature/orders/OrderRepository.kt
package com.app.feature.orders

interface OrderRepository {
    suspend fun getOrders(): Result<List<Order>>
    suspend fun cancelOrder(orderId: String): Result<Unit>
}
```

```kotlin
// androidApp/src/main/kotlin/com/app/feature/orders/OrderListScreen.kt
package com.app.feature.orders

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope

// Android wrapper: bridges shared ViewModel with Android lifecycle
class AndroidOrderListViewModel(
    private val orderRepository: OrderRepository,
) : ViewModel() {
    val shared = OrderListViewModel(
        orderRepository = orderRepository,
        scope = viewModelScope, // Automatically cancelled on destroy
    )
}

@Composable
fun OrderListScreen(viewModel: AndroidOrderListViewModel = viewModel()) {
    val state by viewModel.shared.state.collectAsState()

    OrderListContent(
        state = state,
        onRefresh = { viewModel.shared.onEvent(OrderListEvent.Refresh) },
        onFilter = { viewModel.shared.onEvent(OrderListEvent.FilterByStatus(it)) },
        onCancel = { viewModel.shared.onEvent(OrderListEvent.CancelOrder(it)) },
    )
}
```

```swift
// iosApp/Sources/Features/Orders/OrderListView.swift
import SwiftUI
import Shared // KMP shared module

@MainActor
class IOSOrderListViewModel: ObservableObject {
    private let shared: OrderListViewModel
    private var stateCollector: Closeable?

    @Published var state: OrderListState = OrderListState(
        orders: [],
        isLoading: false,
        error: nil,
        filter: nil
    )

    init(orderRepository: OrderRepository) {
        let scope = ViewModelScope() // Custom iOS coroutine scope
        self.shared = OrderListViewModel(
            orderRepository: orderRepository,
            scope: scope.coroutineScope
        )

        // Collect Kotlin StateFlow into SwiftUI @Published
        stateCollector = FlowCollector.collect(
            flow: shared.state
        ) { [weak self] newState in
            self?.state = newState
        }
    }

    func onEvent(_ event: OrderListEvent) {
        shared.onEvent(event: event)
    }

    deinit {
        stateCollector?.close()
    }
}

struct OrderListView: View {
    @StateObject private var viewModel: IOSOrderListViewModel

    init(orderRepository: OrderRepository) {
        _viewModel = StateObject(wrappedValue: IOSOrderListViewModel(
            orderRepository: orderRepository
        ))
    }

    var body: some View {
        List {
            ForEach(viewModel.state.orders, id: \.id) { order in
                OrderRow(order: order) {
                    viewModel.onEvent(.CancelOrder(orderId: order.id))
                }
            }
        }
        .refreshable {
            viewModel.onEvent(.Refresh())
        }
        .overlay {
            if viewModel.state.isLoading {
                ProgressView()
            }
        }
    }
}
```

```kotlin
// shared/src/iosMain/kotlin/com/app/util/FlowCollector.kt
package com.app.util

import kotlinx.coroutines.*
import kotlinx.coroutines.flow.StateFlow
import platform.darwin.dispatch_async
import platform.darwin.dispatch_get_main_queue

class ViewModelScope {
    val coroutineScope = CoroutineScope(
        SupervisorJob() + Dispatchers.Main.immediate
    )

    fun cancel() {
        coroutineScope.cancel()
    }
}

fun interface Closeable {
    fun close()
}

object FlowCollector {
    fun <T> collect(flow: StateFlow<T>, callback: (T) -> Unit): Closeable {
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
        scope.launch {
            flow.collect { value ->
                dispatch_async(dispatch_get_main_queue()) {
                    callback(value)
                }
            }
        }
        return Closeable { scope.cancel() }
    }
}
```

## Key Points
- Pass `CoroutineScope` into the shared ViewModel rather than creating it internally - Android uses `viewModelScope` (auto-cancelled), iOS uses a custom scope cancelled in `deinit`
- Use sealed interfaces for events (not lambdas) so the same event handling logic works on both platforms without adaptation
- Always dispatch state updates to the main thread on iOS (`dispatch_get_main_queue`) - Kotlin coroutines don't guarantee main thread on iOS by default
