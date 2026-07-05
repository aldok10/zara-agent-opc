---
type: subskill
title: "Native Modules"
---

# Native Modules

## Core Concepts

- Native modules expose platform-specific functionality (iOS/Android) to React Native JavaScript
- The bridge serializes data as JSON between JS and native — avoid passing large objects frequently
- New Architecture (TurboModules): lazy-loaded, type-safe, with direct JSI bindings (no bridge serialization)
- Fabric (New Architecture renderer) replaces the async bridge for UI components with synchronous access
- Native modules can be sync (return value) or async (Promise/callback) depending on the operation

## Key Practices

- Use TurboModules (New Architecture) for new native modules — codegen provides type safety
- Keep the native interface thin: expose high-level operations, not granular platform APIs
- Handle threading explicitly: heavy work on background threads, UI updates on main thread
- Return Promises from async native methods — aligns with JS async/await patterns
- Create a spec file (TypeScript) for codegen to generate native boilerplate

## Common Mistakes

- Sending large data blobs across the bridge on every frame — causes jank from serialization overhead
- Not handling errors on the native side: unhandled exceptions crash the app silently
- Building native modules when a community package already exists and is maintained

## When to Apply

- Need platform functionality not available in existing React Native libraries
- Performance-critical code that cannot run in JavaScript (image processing, crypto)
- Wrapping an existing native SDK for use in React Native
- Migrating to New Architecture and converting old bridge modules to TurboModules
