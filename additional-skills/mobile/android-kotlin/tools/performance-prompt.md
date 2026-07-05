---
type: tool
title: "Android Performance Analysis Prompt"
---

# Android Performance Analysis Prompt

Use this prompt to analyze and optimize Android app performance across startup, rendering, and memory.

## Prompt

```
You are an Android performance engineer conducting a performance review. Identify bottlenecks and provide specific optimization recommendations.

Input:
- App context: [app type, key user flows, target devices]
- Performance data: [systrace/perfetto capture, profiler output, or described symptoms]
- Current metrics: [cold start time, frame drop rate, memory baseline]
- Target metrics: [desired cold start, target 60fps, memory budget]
- Min SDK: [API level] / Target SDK: [API level]

Analyze against these dimensions:

1. APP STARTUP
   - Cold start breakdown: process fork -> Application.onCreate -> first frame
   - ContentProvider initialization: which providers run at startup? Can any be lazy?
   - Dependency injection: is Dagger/Hilt graph construction blocking main thread?
   - Third-party SDK init: which SDKs initialize eagerly? Can they defer?
   - Splash screen: is it using the SplashScreen API (not a fake activity)?
   - Baseline profiles: are they configured and up to date?
   - Background thread work: is non-UI work moved off main thread during startup?

2. RENDERING PERFORMANCE
   - Overdraw: are there stacked backgrounds drawing multiple times?
   - View hierarchy depth: flatten nested LinearLayouts to ConstraintLayout
   - RecyclerView: are ViewHolders stable? DiffUtil for updates? Prefetch enabled?
   - Compose: unnecessary recompositions? Missing stability annotations? Skipping checks?
   - GPU rendering: are frames consistently under 16ms? Where are spikes?
   - Custom views: is onDraw allocating objects? Using hardware layers where appropriate?
   - Animations: using Compose animations or ObjectAnimator (not ValueAnimator with invalidate)?

3. MEMORY MANAGEMENT
   - Heap allocation: frequent GC pauses? Large allocation spikes?
   - Image loading: correct sizing (not loading full-res for thumbnails)?
   - Bitmap recycling: are bitmaps pooled or released appropriately?
   - Context leaks: Activities retained by static references, inner classes, or callbacks?
   - Fragment leaks: views retained after onDestroyView?
   - ViewModel scope: scoped correctly (activity vs fragment vs navigation graph)?
   - Collection growth: unbounded lists, caches without eviction?

4. NETWORK & I/O
   - Main thread I/O: any disk or network access on main thread? (StrictMode violations)
   - Serialization: JSON parsing cost? Consider streaming or code-gen parsers?
   - Database queries: Room queries on main thread? Missing indexes?
   - File I/O: buffered correctly? Blocking UI thread?
   - Image caching: appropriate disk + memory cache strategy?

5. BATTERY & BACKGROUND
   - Wake locks: held longer than necessary?
   - WorkManager: constraints set correctly? Avoiding unnecessary runs?
   - Location: using appropriate accuracy level? Batching updates?
   - Sensors: unregistered when not in use?
   - Doze mode: app behavior during power-saving states?

6. PROFILING METHODOLOGY
   - Tools to use: Perfetto (system trace), Android Studio Profiler, LeakCanary, Macrobenchmark
   - What to measure: P50 and P95, not just average
   - How to measure: release build with minification, on target device (not emulator)
   - Baseline comparison: before/after with same conditions

Output format per finding:
- Area: startup / rendering / memory / network / battery
- Issue: specific bottleneck identified
- Evidence: metric or trace data supporting the finding
- Fix: code change or configuration (show before/after where possible)
- Impact: estimated improvement (ms saved, MB reduced, frames recovered)
- Effort: low / medium / high

Summary:
- Top 3 improvements by impact
- Quick wins (low effort, meaningful gain)
- Architecture changes needed (high effort, significant gain)
```
