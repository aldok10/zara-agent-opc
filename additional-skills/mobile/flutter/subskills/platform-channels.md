---
type: subskill
title: "Platform Channels"
---

# Platform Channels

## Core Concepts

- Platform channels bridge Dart code with native platform code (Kotlin/Swift)
- MethodChannel: request/response pattern for one-off native calls
- EventChannel: stream pattern for continuous native events (sensors, location, connectivity)
- Messages are encoded as binary (StandardMethodCodec)  -  supports basic types, lists, maps
- Channels are asynchronous: Dart awaits, native responds on the platform thread

## Key Practices

- Define channel names as constants shared between Dart and native code  -  typos cause silent failures
- Handle errors on both sides: native throws, Dart receives PlatformException
- Use Pigeon code generator for type-safe channel interfaces  -  eliminates manual serialization
- Keep native code minimal: thin wrapper around platform APIs, business logic stays in Dart
- Test channels with mock method call handlers in Dart unit tests

## Common Mistakes

- Performing heavy work on the platform main thread: blocks native UI just like blocking Dart's isolate
- Passing complex objects without proper serialization  -  only basic types cross the channel
- Not handling the case where the native side isn't implemented (app running on web/desktop)

## When to Apply

- Need access to platform-specific APIs not available in existing Flutter plugins
- Building a custom plugin that wraps a native SDK (payments, biometrics, hardware)
- Receiving continuous native events (Bluetooth, accelerometer) in Flutter
- Integrating Flutter as a module into an existing native app
