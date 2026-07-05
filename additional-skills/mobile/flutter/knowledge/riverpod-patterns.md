# Riverpod Patterns (2026)

## Provider Types

Riverpod 2.x with code generation is the recommended approach.

```dart
@riverpod
class OrderList extends _$OrderList {
  @override
  Future<List<Order>> build() async {
    return ref.watch(orderRepositoryProvider).fetchAll();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => ref.read(orderRepositoryProvider).fetchAll());
  }
}
```

### Provider categories (code gen)

| Annotation | Generated Type | Use Case |
|-----------|---------------|----------|
| `@riverpod` (function) | Auto (Provider/FutureProvider) | Simple computation or async fetch |
| `@riverpod` (class) | Notifier/AsyncNotifier | Mutable state with methods |
| `@Riverpod(keepAlive: true)` | Never auto-disposed | App-lifetime state (auth, settings) |

### Without code gen (manual)

```dart
final authStateProvider = StreamProvider<AuthState>((ref) {
  return ref.watch(authServiceProvider).authStateChanges();
});
```

## AsyncValue

Pattern matching for async state:

```dart
class OrderListPage extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersAsync = ref.watch(orderListProvider);

    return ordersAsync.when(
      data: (orders) => OrderListView(orders: orders),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => ErrorWidget(
        message: error.toString(),
        onRetry: () => ref.invalidate(orderListProvider),
      ),
    );
  }
}
```

`AsyncValue` states:
- `AsyncData` -- has value (may also have previous error via `hasError`)
- `AsyncLoading` -- first load or refresh (check `value` for previous data)
- `AsyncError` -- failed (check `value` for stale data to show)

Key: `ref.invalidate(provider)` resets state and triggers rebuild. Prefer over manual refresh for simple cases.

## Scoping and Overrides

```dart
// Family -- parameterized providers
@riverpod
Future<Order> orderDetail(OrderDetailRef ref, {required String orderId}) async {
  return ref.watch(orderRepositoryProvider).fetchById(orderId);
}

// Override for testing
void main() {
  runApp(
    ProviderScope(
      overrides: [
        orderRepositoryProvider.overrideWithValue(FakeOrderRepository()),
      ],
      child: const MyApp(),
    ),
  );
}
```

## Dependency Management

```dart
@riverpod
OrderRepository orderRepository(OrderRepositoryRef ref) {
  final client = ref.watch(httpClientProvider);
  final cache = ref.watch(localCacheProvider);
  return OrderRepositoryImpl(client: client, cache: cache);
}
```

Provider dependencies are tracked automatically. When `httpClientProvider` changes, `orderRepositoryProvider` rebuilds.

## Lifecycle and Disposal

```dart
@riverpod
class WebSocketConnection extends _$WebSocketConnection {
  @override
  Stream<Message> build() {
    final channel = WebSocketChannel.connect(Uri.parse(wsUrl));

    ref.onDispose(() => channel.sink.close());

    return channel.stream.map((data) => Message.fromJson(jsonDecode(data)));
  }
}
```

- `ref.onDispose()` -- cleanup when provider is disposed
- `ref.keepAlive()` -- prevent auto-disposal (use sparingly)
- `ref.invalidateSelf()` -- trigger rebuild from within notifier

## Testing

```dart
test('OrderList loads orders', () async {
  final container = ProviderContainer(
    overrides: [
      orderRepositoryProvider.overrideWithValue(FakeOrderRepository([
        Order(id: '1', status: OrderStatus.delivered),
      ])),
    ],
  );

  final listener = Listener<AsyncValue<List<Order>>>();
  container.listen(orderListProvider, listener.call);

  await container.read(orderListProvider.future);

  verify(() => listener(
    any(that: isA<AsyncLoading>()),
    any(that: isA<AsyncData<List<Order>>>()),
  ));
});
```

## Common Pitfalls

- Using `ref.read` in build (loses reactivity) -- use `ref.watch` for reactive, `ref.read` for events only
- Not handling loading state when previous data exists (show stale data + loading indicator)
- Forgetting `keepAlive: true` for auth/session providers (they get disposed during navigation)
- Over-scoping -- prefer focused providers over a single large state provider
- Not using `select` for fine-grained rebuilds: `ref.watch(userProvider.select((u) => u.name))`
