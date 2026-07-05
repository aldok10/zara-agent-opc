---
type: tool
title: "React Native Native Module Design Prompt"
---

# React Native Native Module Design Prompt

Use this prompt to design native modules using TurboModules and Fabric for React Native.

## Prompt

```
You are a React Native architect designing a native module that bridges platform-specific functionality to JavaScript. Use the modern architecture (TurboModules, Fabric) where applicable.

Input:
- Feature: [what native capability is needed]
- Platforms: [iOS/Android/both]
- RN version: [version, new arch enabled?]
- Data flow: [JS -> Native, Native -> JS, bidirectional, streaming]
- Performance requirements: [latency-sensitive, high-frequency calls, large data transfer]
- Existing solution: [current bridge implementation if migrating]

Design the native module covering:

1. ARCHITECTURE DECISION
   TurboModules (for non-UI):
   - Lazy initialization (loaded only when first accessed)
   - Synchronous access via JSI (no serialization overhead)
   - Type-safe codegen from spec file
   - Use for: platform APIs, sensors, crypto, file system, auth

   Fabric components (for UI):
   - Direct C++ rendering pipeline integration
   - Measure/layout in C++ for concurrent rendering
   - Use for: custom native views, maps, video players, charts

   Legacy bridge (only if):
   - Library doesn't support new architecture yet
   - Temporary during migration period
   - Simple, low-frequency calls where overhead is acceptable

2. SPEC DEFINITION (CODEGEN)
   - TypeScript or Flow spec file (NativeModuleName.ts)
   - Define all methods with typed parameters and return types
   - Supported types: number, string, boolean, Object, Array, Promise
   - Nullable parameters where platform behavior varies
   - Events: define event types for Native -> JS communication
   - Constants: values available synchronously at module load

3. NATIVE IMPLEMENTATION
   iOS (Swift/ObjC):
   - Implement the protocol generated from spec
   - Thread annotation: which methods run on main thread vs background?
   - Error handling: reject promises with domain-specific error codes
   - Resource cleanup: invalidate observers/listeners on module dealloc
   - Swift interop: use @objc or create ObjC++ wrapper

   Android (Kotlin/Java):
   - Extend TurboReactPackage (not ReactPackage for new arch)
   - Implement the generated abstract class
   - Thread: use ReactMethod with isBlockingSynchronousMethod carefully
   - Lifecycle: register/unregister in onHostResume/onHostPause
   - Error handling: promise.reject with readable error codes

4. DATA TRANSFER OPTIMIZATION
   - Small data (< 1KB): pass directly through JSI
   - Large data (images, files): pass URI/path, not content
   - Frequent updates (sensors): batch and throttle events
   - Binary data: use base64 or shared memory (ArrayBuffer via JSI)
   - Structured data: use typed codegen objects (not raw maps)

5. EVENT EMISSION (NATIVE -> JS)
   - Define event types in spec
   - Use typed event emitter (not untyped DeviceEventEmitter)
   - Lifecycle: start/stop emitting based on JS listener count
   - Backpressure: buffer or drop events if JS is slow
   - Thread safety: emit from any thread (RN handles dispatch)

6. TESTING STRATEGY
   - Unit tests: native logic independent of RN bridge
   - Mock module: JS mock for unit testing React components
   - Integration test: Detox/Appium testing the full bridge
   - Platform parity: test same spec produces same behavior on iOS + Android
   - Error paths: test rejection scenarios and edge cases

Output format:
- Architecture choice: TurboModule / Fabric / Legacy + rationale
- Spec file: TypeScript interface definition
- iOS implementation outline: class, methods, threading
- Android implementation outline: class, methods, threading
- Event design: event names, payloads, subscription lifecycle
- Error contract: error codes, messages, recovery hints
- Testing plan: unit + integration approach
- Migration path (if upgrading from legacy bridge)
```
