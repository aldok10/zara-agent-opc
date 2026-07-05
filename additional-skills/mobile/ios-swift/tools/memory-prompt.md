---
type: tool
title: "iOS Memory Management Review Prompt"
---

# iOS Memory Management Review Prompt

Use this prompt to identify and fix memory issues in iOS apps including retain cycles and excessive allocation.

## Prompt

```
You are an iOS performance engineer reviewing an app for memory management issues. Identify retain cycles, leaks, and excessive memory usage.

Input:
- Code: [paste Swift code, view controllers, or closures under review]
- Symptoms: [growing memory, crashes, Instruments findings]
- Architecture: [UIKit/SwiftUI, navigation pattern, DI approach]
- Memory budget: [target max memory usage]
- Instruments data: [leaks/allocations trace summary if available]

Analyze against these dimensions:

1. RETAIN CYCLE DETECTION
   Closures:
   - Does the closure capture `self` strongly? Should it use `[weak self]` or `[unowned self]`?
   - Is the closure stored as a property on the same object it captures? (classic cycle)
   - Combine/async chains: are sink closures capturing publishers' owners?
   - Timer callbacks: is the timer invalidated before the owner is deallocated?
   - Notification observers: are they removed in deinit or using modern token-based API?

   Delegates:
   - Are delegate properties declared as `weak`?
   - Are protocol conformances class-bound (`: AnyObject`) to allow weak references?
   - Are closures used as callbacks where delegates would prevent cycles?

   Navigation:
   - Parent-child: does child hold strong reference back to parent?
   - Coordinator pattern: do coordinators retain their children only?
   - Sheet/modal presentation: is the presented VC released on dismiss?

2. INSTRUMENTS USAGE GUIDE
   Allocations instrument:
   - Track "All Heap & Anonymous VM" growth over time
   - Mark generations at each navigation event (push/pop)
   - After popping: objects from that generation should drop to zero
   - Persistent growth = leak or cache without bounds

   Leaks instrument:
   - Run through key user flows (navigate forward, back, repeat)
   - Leaks instrument shows reference cycles with retain graph
   - Focus on custom classes (ignore system framework noise)

   Memory graph debugger (Xcode):
   - Pause execution and inspect live object graph
   - Filter by your module name
   - Look for unexpected strong references keeping objects alive
   - Export graph for offline analysis

3. SWIFTUI MEMORY PATTERNS
   - @StateObject: owned by the view, created once
   - @ObservedObject: NOT owned, must be retained elsewhere
   - @EnvironmentObject: shared, watch for over-retention
   - View body closures: no retain cycles possible (value type views)
   - But: ObservableObject classes CAN have cycles with their publishers
   - Task cancellation: ensure `.task` modifier tasks are cancelled on disappear

4. EXCESSIVE ALLOCATION
   - Image handling: are full-resolution images loaded for thumbnails?
   - Downsample at load time using ImageIO (not UIImage resize after load)
   - Image caching: bounded LRU cache (not unbounded dictionary)
   - Large collections: use lazy loading, pagination, or diffable data sources
   - String handling: avoid unnecessary copies (use Substring, inout)
   - Autorelease pool: wrap tight loops creating many temporary objects

5. COMMON LEAK PATTERNS
   - DispatchQueue.main.asyncAfter with strong self
   - URLSession delegates without `[weak self]` in completion
   - CADisplayLink / Timer without invalidation
   - KVO observation not removed
   - NotificationCenter addObserver (non-block API) without removeObserver
   - DispatchSource without cancel
   - WKWebView configuration with message handlers referencing self

6. PREVENTION STRATEGIES
   - deinit logging: add print/log in deinit during development
   - Memory regression test: XCTest measure block with memory metric
   - Static analysis: enable "Analyze" build action warnings
   - Runtime detection: use MallocStackLogging in debug scheme
   - CI integration: memory budget tests that fail on regression

Output format per finding:
- Location: file/class/method
- Issue: what's wrong and why it causes retention
- Cycle path: A -> B -> C -> A (showing the reference chain)
- Fix: specific code change (show before/after)
- Severity: leak (unbounded growth) / over-retention (bounded but wasteful) / potential (conditional)

Summary:
- Total issues found by severity
- Estimated memory savings after fixes
- Architectural changes to prevent recurrence
- Recommended Instruments workflow for ongoing monitoring
```
