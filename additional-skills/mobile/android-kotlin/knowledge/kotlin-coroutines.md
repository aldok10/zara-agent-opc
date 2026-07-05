# Kotlin Coroutines & Flow (2026)

## Structured Concurrency

Core principle: every coroutine has a parent scope, and cancellation/failure propagates predictably.

Scope hierarchy:
- `viewModelScope` -- cancelled when ViewModel cleared
- `lifecycleScope` -- cancelled when Lifecycle destroyed
- `rememberCoroutineScope()` -- cancelled when leaving composition
- Custom `CoroutineScope(SupervisorJob() + Dispatchers.Main)` -- you manage cancellation

```kotlin
class OrderViewModel @Inject constructor(
    private val orderRepo: OrderRepository
) : ViewModel() {
    // viewModelScope auto-cancels on ViewModel.onCleared()
    fun placeOrder(order: Order) {
        viewModelScope.launch {
            orderRepo.submit(order) // cancellable suspend function
        }
    }
}
```

SupervisorJob vs Job:
- `Job`: one child failure cancels all siblings (default in `coroutineScope {}`)
- `SupervisorJob`: child failure doesn't affect siblings (use for independent parallel work)
- `supervisorScope {}` creates inline supervisor scope

## Flow

Cold stream -- collection triggers emission. Each collector gets independent execution.

```kotlin
class StockRepository(private val api: StockApi) {
    fun priceStream(ticker: String): Flow<Price> = flow {
        while (currentCoroutineContext().isActive) {
            emit(api.getPrice(ticker))
            delay(5.seconds)
        }
    }
}
```

Operators to know:
- `map`, `filter`, `take` -- standard transforms
- `flatMapLatest` -- cancel previous inner flow on new emission (search-as-you-type)
- `conflate` -- drop intermediate values when collector is slow
- `debounce(300.milliseconds)` -- wait for pause in emissions
- `distinctUntilChanged()` -- skip duplicate consecutive emissions
- `catch { }` -- handle upstream errors, can emit fallback
- `onStart`, `onCompletion`, `onEmpty` -- lifecycle hooks
- `shareIn`, `stateIn` -- convert cold Flow to hot SharedFlow/StateFlow

## StateFlow

Hot state holder -- always has a current value, replays latest to new collectors.

```kotlin
class ProfileViewModel @Inject constructor(
    private val userRepo: UserRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<ProfileUiState>(ProfileUiState.Loading)
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            userRepo.observeUser()
                .map { ProfileUiState.Success(it) }
                .catch { emit(ProfileUiState.Error(it.message)) }
                .collect { _uiState.value = it }
        }
    }
}
```

StateFlow vs SharedFlow:
- StateFlow: single value, conflated, requires initial value, equality-based dedup
- SharedFlow: event stream, configurable replay/buffer, no initial value needed

In Compose, collect with lifecycle awareness:
```kotlin
val state by viewModel.uiState.collectAsStateWithLifecycle()
```
This stops collection when lifecycle falls below STARTED (saves resources when app backgrounded).

## Error Handling

Strategies:
1. **try/catch in launch**: handle locally, don't propagate
2. **catch operator on Flow**: transform error to UI state
3. **CoroutineExceptionHandler**: last resort for uncaught exceptions (logging)
4. **Result wrapper**: `runCatching {}` for explicit error modeling

```kotlin
sealed interface Result<out T> {
    data class Success<T>(val data: T) : Result<T>
    data class Failure(val error: AppError) : Result<Nothing>
}

suspend fun <T> safeCall(block: suspend () -> T): Result<T> =
    try { Result.Success(block()) }
    catch (e: CancellationException) { throw e } // never swallow cancellation
    catch (e: Exception) { Result.Failure(e.toAppError()) }
```

Critical rule: **never catch CancellationException** (or catch and rethrow). Swallowing it breaks structured concurrency.

## Testing Coroutines

```kotlin
@Test
fun loadProfile_success() = runTest {
    val repo = FakeUserRepository(User("Alice"))
    val vm = ProfileViewModel(repo)

    advanceUntilIdle()

    assertIs<ProfileUiState.Success>(vm.uiState.value)
}
```

- `runTest` uses `StandardTestDispatcher` -- coroutines don't run until you advance
- `advanceUntilIdle()` runs all pending coroutines
- `advanceTimeBy(duration)` for time-dependent tests
- Inject `TestDispatcher` via DI to control execution in ViewModels
- `Turbine` library for testing Flow emissions: `flow.test { assertEquals(expected, awaitItem()) }`
