---
type: fact
title: "SwiftUI Patterns (2026)"
---

# SwiftUI Patterns (2026)

## State Management

SwiftUI's state system is built on the Observation framework (Swift 5.9+/iOS 17+).

### @Observable (replaces ObservableObject)

```swift
@Observable
class ProfileViewModel {
    var profile: Profile?
    var isLoading = false
    var error: AppError?

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            profile = try await profileService.fetch()
        } catch {
            self.error = error.toAppError()
        }
    }
}
```

Key differences from ObservableObject:
- No `@Published` needed -- all stored properties are tracked automatically
- Views only re-render when properties they actually READ change (fine-grained tracking)
- Use `@ObservationIgnored` to exclude properties from tracking
- Pass via environment: `@Environment(ProfileViewModel.self) var vm`

### State Hierarchy

| Property Wrapper | Use Case | Ownership |
|-----------------|----------|-----------|
| `@State` | View-local value types | View owns it |
| `@Binding` | Two-way reference to parent's state | Parent owns it |
| `@Environment` | Injected dependencies/settings | Environment owns it |
| `@Bindable` | Binding to @Observable property | Observable owns it |
| `let` | Immutable data from parent | No ownership |

### Legacy (pre-iOS 17)

`@StateObject`, `@ObservedObject`, `@EnvironmentObject` still work but are superseded by `@Observable` + `@State`/`@Environment` for new code.

## Navigation

### NavigationStack (iOS 16+)

```swift
struct OrderFlow: View {
    @State private var path = NavigationPath()

    var body: some View {
        NavigationStack(path: $path) {
            OrderListView(onSelect: { path.append($0) })
                .navigationDestination(for: Order.self) { order in
                    OrderDetailView(order: order)
                }
                .navigationDestination(for: TrackingInfo.self) { info in
                    TrackingView(info: info)
                }
        }
    }
}
```

Deep linking: manipulate `path` programmatically to push multiple destinations.

### Coordinator Pattern (complex flows)

```swift
@Observable
class OrderCoordinator {
    var path = NavigationPath()

    func showDetail(_ order: Order) { path.append(order) }
    func showTracking(_ info: TrackingInfo) { path.append(info) }
    func popToRoot() { path = NavigationPath() }
}
```

## View Lifecycle

- `onAppear` / `onDisappear` -- basic lifecycle (can fire multiple times in lists)
- `.task { }` -- async work tied to view lifetime, auto-cancelled on disappear
- `.task(id:)` -- restarts when id changes (replaces onAppear + onChange combo)
- `.onChange(of:)` -- react to value changes (iOS 17: closure receives old and new value)

```swift
struct SearchView: View {
    @State private var query = ""

    var body: some View {
        List { /* results */ }
            .searchable(text: $query)
            .task(id: query) {
                try? await Task.sleep(for: .milliseconds(300)) // debounce
                guard !Task.isCancelled else { return }
                await viewModel.search(query)
            }
    }
}
```

## Performance

- Avoid `AnyView` -- breaks SwiftUI's diffing (use `@ViewBuilder` or `Group` instead)
- Extract subviews to separate structs for targeted re-rendering
- Use `EquatableView` or `.equatable()` for complex views that shouldn't re-render unless data changes
- Lazy containers (`LazyVStack`, `LazyHGrid`) for large collections
- Use `.id()` carefully -- it destroys and recreates the view

## Previews

```swift
#Preview("Loaded") {
    OrderListView(viewModel: .preview(state: .loaded(Order.samples)))
}

#Preview("Loading") {
    OrderListView(viewModel: .preview(state: .loading))
}

#Preview("Error") {
    OrderListView(viewModel: .preview(state: .error("Network timeout")))
}
```

Previews with `@Observable` just work -- no special preview wrapper needed.

## Accessibility

- Always provide `accessibilityLabel` for non-text elements
- Use `accessibilityElement(children:)` to group or ignore child elements
- Test with VoiceOver in simulator: Xcode > Accessibility Inspector
- Dynamic Type: use system fonts or `.font(.body)` variants, avoid fixed sizes
