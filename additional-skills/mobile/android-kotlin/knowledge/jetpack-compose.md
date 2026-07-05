# Jetpack Compose (2026)

## Compose Compiler

Compose compiler is now bundled with Kotlin 2.x (no separate version alignment needed).

Key compiler behaviors:
- **Stability inference**: compiler marks classes as stable/unstable based on their properties
- **Skipping**: stable composables with unchanged params skip recomposition
- **Strong skipping mode** (default in Kotlin 2.0+): even unstable params use equals() check before recomposing
- Use `@Stable` or `@Immutable` annotations only when compiler inference fails
- Check stability reports: `kotlinOptions { freeCompilerArgs += "-P plugin:androidx.compose.compiler.plugins.kotlin:reportsDestination=..."}` (legacy) or use Compose compiler Gradle plugin metrics

Compose compiler metrics to watch:
- restartable but not skippable functions -- potential recomposition waste
- Unstable classes passed as params -- triggers recomposition even when values haven't changed

## State Management

```kotlin
// State hoisting pattern
@Composable
fun SearchScreen(viewModel: SearchViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    SearchContent(state = uiState, onQuery = viewModel::search)
}

@Composable
private fun SearchContent(state: SearchUiState, onQuery: (String) -> Unit) {
    // Stateless, testable, previewable
}
```

State holders hierarchy:
1. `remember { mutableStateOf() }` -- simple UI state (toggle, text field)
2. `rememberSaveable` -- survives config change (scroll position, form input)
3. Custom state holder class -- complex UI logic (multiple interacting states)
4. ViewModel + StateFlow -- business logic state, survives nav

Avoid:
- `mutableStateListOf` for large lists (use `SnapshotStateList` or immutable list in StateFlow)
- Storing derived state -- use `derivedStateOf` to avoid redundant recomposition
- Reading state in wrong scope -- read state as late as possible to narrow recomposition

## Side Effects

| Effect | Use Case | Lifecycle |
|--------|----------|-----------|
| `LaunchedEffect(key)` | One-shot or key-driven coroutine | Cancels on leave/key change |
| `rememberCoroutineScope()` | Event-driven coroutine (click handler) | Tied to composition |
| `DisposableEffect(key)` | Register/unregister (listeners, callbacks) | Calls onDispose on leave |
| `SideEffect` | Non-suspend code every successful recomposition | Synchronous |
| `produceState` | Convert non-Compose state to Compose State | Cancels on leave |
| `snapshotFlow` | Convert Compose State to Flow | Within coroutine scope |

Common mistakes:
- Using `LaunchedEffect(Unit)` when the effect depends on a changing key
- Launching coroutines directly in composition (causes restart on every recomposition)
- Forgetting cleanup in `DisposableEffect`

## Lifecycle and Recomposition

Composition lifecycle: Enter composition -> Recompose 0..N times -> Leave composition

Recomposition triggers:
- State read during composition changes
- Parent recomposes and passes different params (unless skippable + same values)

Performance patterns:
- Use `key()` in lazy lists to preserve state across reorderings
- Defer reads with lambda params: `Modifier.offset { IntOffset(x, 0) }` reads during layout, not composition
- Use `@NonRestartableComposable` for composables that only call other composables (rare)
- Profile with Layout Inspector recomposition counts and Compose tracing

## Compose + Navigation

Compose Navigation (2.8+) uses type-safe routes with `@Serializable` data classes:

```kotlin
@Serializable data class Profile(val userId: String)

NavHost(navController, startDestination = Home) {
    composable<Home> { HomeScreen(onNavigate = { navController.navigate(Profile(it)) }) }
    composable<Profile> { backStackEntry ->
        val profile: Profile = backStackEntry.toRoute()
        ProfileScreen(profile.userId)
    }
}
```

ViewModel scoping:
- Default: scoped to NavBackStackEntry (destroyed on pop)
- Shared: scope to parent graph with `hiltViewModel(navController.getBackStackEntry(parentRoute))`

## Testing Compose

```kotlin
@Test
fun searchContent_displaysResults() {
    composeTestRule.setContent {
        SearchContent(state = SearchUiState(results = listOf("Item")), onQuery = {})
    }
    composeTestRule.onNodeWithText("Item").assertIsDisplayed()
}
```

Use `createComposeRule()` for pure Compose tests (no Activity needed).
Use semantics matchers: `hasText()`, `hasContentDescription()`, `hasTestTag()`.
