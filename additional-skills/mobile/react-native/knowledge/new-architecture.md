---
type: fact
title: "React Native New Architecture (2026)"
---

# React Native New Architecture (2026)

## Overview

The New Architecture is the default since React Native 0.76. It replaces the Bridge with JSI (JavaScript Interface) for synchronous native communication.

Key components:
- **JSI**: C++ layer enabling direct JS-to-native calls (no JSON serialization)
- **Fabric**: New rendering system with synchronous layout and concurrent features
- **TurboModules**: Lazy-loaded native modules with type-safe Codegen
- **Codegen**: Generates C++ type bindings from TypeScript/Flow specs

## Fabric Renderer

Fabric replaces the old async bridge-based rendering:

| Old Architecture | Fabric |
|-----------------|--------|
| Async bridge messages | Synchronous JSI calls |
| Shadow tree on native thread | Shadow tree accessible from any thread |
| Batched UI updates | Concurrent rendering support |
| Layout computed asynchronously | Layout computed synchronously when needed |

Implications for developers:
- `useLayoutEffect` now works correctly (layout is synchronous)
- Concurrent features (Suspense, transitions) are supported
- Native views can be measured synchronously from JS
- Gesture handling is more responsive (no bridge delay)

### Migration Notes

Most components work without changes. Breaking cases:
- Direct native view manipulation (use `ref` + `measure` instead of `UIManager`)
- Custom native components need Fabric-compatible ViewManagers
- `setNativeProps` is deprecated -- use state or animated values

## TurboModules

TurboModules replace legacy Native Modules with:
- Lazy loading (only initialized when first called)
- Synchronous method invocation via JSI
- Type-safe interface via Codegen

```typescript
// specs/NativeDeviceInfo.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  getDeviceId(): string;  // synchronous
  getBatteryLevel(): Promise<number>;  // async
  getConstants(): {
    brand: string;
    model: string;
    systemVersion: string;
  };
}

export default TurboModuleRegistry.getEnforcing<Spec>('DeviceInfo');
```

Key differences from old Native Modules:
- Methods can be synchronous (no bridge serialization needed)
- Constants are lazy (computed on first access, not at module init)
- Type-safe contract enforced by Codegen

## Codegen

Codegen reads TypeScript specs and generates:
- C++ interface declarations
- Platform-specific scaffolding (ObjC++ for iOS, Java/Kotlin for Android)
- Type-safe bridge code

```bash
# Runs automatically during build, or manually:
npx react-native codegen
```

Supported types:
- Primitives: `boolean`, `number`, `string`
- Objects: `{ key: Type }` (generates native struct)
- Arrays: `Array<Type>`
- Enums: `'value1' | 'value2'` (string unions)
- Callbacks: `(value: Type) => void`
- Promises: `Promise<Type>`

## Migration from Old Architecture

### Step 1: Enable New Architecture

```ruby
# ios/Podfile
ENV['RCT_NEW_ARCH_ENABLED'] = '1'
```

```groovy
// android/gradle.properties
newArchEnabled=true
```

### Step 2: Migrate Native Modules to TurboModules

1. Create TypeScript spec in `specs/` directory
2. Implement the generated native interface
3. Remove old `@ReactModule` / `RCT_EXPORT_MODULE` code

### Step 3: Migrate Native Components to Fabric

1. Create component spec with `codegenNativeComponent`
2. Implement `ComponentDescriptor` (C++) + platform ViewManager
3. Old `requireNativeComponent` still works via interop layer

### Interop Layer

React Native provides an interop layer so old-arch components work under Fabric without rewrite. Performance is slightly lower than native Fabric components, but functional. Migrate incrementally.

## Performance Characteristics

- **Module init**: TurboModules load on first use (vs all-at-startup with old modules)
- **Method calls**: ~10x faster for synchronous methods (no JSON serialization)
- **Rendering**: Fabric supports concurrent rendering, reducing dropped frames during transitions
- **Memory**: Shared ownership (C++ shared_ptr) reduces copy overhead between JS and native
- **Startup**: Lazy module loading improves cold start by 10-30% (app dependent)

## Debugging

- Flipper still works but is being replaced by Chrome DevTools + Expo Dev Tools
- Fabric components appear in React DevTools component tree
- Hermes profiler shows JSI call overhead (look for `nativeCall` in traces)
- Use `Performance.mark()` / `Performance.measure()` for custom timing
