---
type: fact
title: "Cross-Platform Performance Bridging"
---

# Cross-Platform Performance Bridging

## The Bridge Problem

Cross-platform frameworks communicate between scripted code and native APIs. This bridge is the primary performance bottleneck.

## React Native: Old Bridge vs JSI

**Old Architecture**: JS ←→ JSON serialization ←→ Bridge Queue ←→ Native (async, batched at 5ms)

**New Architecture (JSI + TurboModules + Fabric)**:
- JSI: C++ layer exposing native objects directly to JS. No serialization. ~10x faster.
- TurboModules: lazy-loaded native modules (only init when first accessed)
- Fabric: synchronous layout in C++ (no bridge hop)

| Operation | Old Bridge | JSI/Fabric |
|-----------|-----------|------------|
| Native method call | ~3ms | ~0.01ms |
| Layout pass | ~16ms (3 threads) | ~4ms (sync C++) |
| Module init (50 modules) | ~300ms (eager) | ~50ms (lazy) |

## Flutter: Dart FFI

**Platform Channels** (async, serialized): `await platform.invokeMethod('getBatteryLevel')`

**dart:ffi** (synchronous, zero-copy):
```dart
final dylib = DynamicLibrary.open('libfast_math.so');
final add = dylib.lookupFunction<Int32 Function(Int32, Int32), int Function(int, int)>('add');
final result = add(3, 5); // near-native speed, no serialization
```

| Mechanism | Use Case | Overhead |
|-----------|----------|----------|
| Platform Channels | Infrequent OS calls (permissions, sensors) | ~1-2ms |
| dart:ffi | Hot-path computation (crypto, image, ML) | ~0.001ms |

## Kotlin Multiplatform (KMP)

```kotlin
// commonMain  -  shared logic
expect class PlatformCrypto() { fun sha256(input: ByteArray): ByteArray }

// androidMain  -  JVM directly (zero overhead)
actual class PlatformCrypto { actual fun sha256(input: ByteArray) = MessageDigest.getInstance("SHA-256").digest(input) }

// iosMain  -  cinterop with C/Obj-C (near-zero overhead)
actual class PlatformCrypto { actual fun sha256(input: ByteArray) = /* CommonCrypto CC_SHA256 */ }
```

| Scenario | Overhead |
|----------|----------|
| Kotlin/JVM → Java | Zero (same runtime) |
| Kotlin/Native → C | Minimal (direct memory) |
| Kotlin/Native → Obj-C | Near-zero (built-in interop) |
| Shared code on iOS | ~1.2x native speed (LLVM) |

## Optimization Patterns

1. **Batch bridge calls**: send array, not 100 individual calls
2. **Move computation off bridge**: send config once → native executes (e.g., `useNativeDriver: true`)
3. **Memory sharing**: SharedArrayBuffer (RN), `Pointer<Uint8>` (Flutter), pinned memory (KMP)
4. **Separate hot/cold paths**: critical UI on native thread, heavy work on background

## Decision Guide

| Constraint | Best Choice |
|-----------|-------------|
| Existing React team | React Native + JSI |
| Pixel-perfect custom UI | Flutter (owns render pipeline) |
| Shared business logic, native UI | KMP + SwiftUI/Compose |
| Heavy native SDK usage | KMP (thinnest abstraction) |
| 120fps animations | Flutter (Impeller engine) |
| Brownfield (add to native app) | KMP (embeds, no runtime) |
