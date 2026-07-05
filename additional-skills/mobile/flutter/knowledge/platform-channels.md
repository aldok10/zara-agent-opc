---
type: fact
title: "Platform Channels (2026)"
---

# Platform Channels (2026)

## Overview

Platform channels enable communication between Dart and native code (Kotlin/Swift). Three mechanisms exist plus newer alternatives.

## MethodChannel

Bidirectional RPC-style calls. Most common pattern.

```dart
// Dart side
class BatteryService {
  static const _channel = MethodChannel('com.example.app/battery');

  Future<int> getBatteryLevel() async {
    final level = await _channel.invokeMethod<int>('getBatteryLevel');
    return level ?? -1;
  }

  Future<bool> isCharging() async {
    return await _channel.invokeMethod<bool>('isCharging') ?? false;
  }
}
```

```kotlin
// Android (Kotlin)
class BatteryPlugin(private val context: Context) : MethodChannel.MethodCallHandler {
    override fun onMethodCall(call: MethodCall, result: MethodChannel.Result) {
        when (call.method) {
            "getBatteryLevel" -> {
                val manager = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
                result.success(manager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY))
            }
            "isCharging" -> {
                val manager = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
                result.success(manager.isCharging)
            }
            else -> result.notImplemented()
        }
    }
}
```

```swift
// iOS (Swift)
class BatteryPlugin: NSObject {
    static func register(with registrar: FlutterPluginRegistrar) {
        let channel = FlutterMethodChannel(name: "com.example.app/battery", binaryMessenger: registrar.messenger())
        let instance = BatteryPlugin()
        registrar.addMethodCallDelegate(instance, channel: channel)
    }

    func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        switch call.method {
        case "getBatteryLevel":
            UIDevice.current.isBatteryMonitoringEnabled = true
            result(Int(UIDevice.current.batteryLevel * 100))
        case "isCharging":
            result(UIDevice.current.batteryState == .charging)
        default:
            result(FlutterMethodNotImplemented)
        }
    }
}
```

## EventChannel

For continuous streams from native to Dart (sensors, location, connectivity).

```dart
// Dart
class AccelerometerService {
  static const _channel = EventChannel('com.example.app/accelerometer');

  Stream<AccelerometerEvent> get events {
    return _channel.receiveBroadcastStream().map((data) {
      final map = Map<String, double>.from(data as Map);
      return AccelerometerEvent(x: map['x']!, y: map['y']!, z: map['z']!);
    });
  }
}
```

Native side implements `StreamHandler` with `onListen`/`onCancel`.

## FFI (Foreign Function Interface)

Direct C interop without channel overhead. Best for:
- Performance-critical code (image processing, crypto)
- Existing C/C++ libraries
- Avoiding platform channel serialization cost

```dart
// Using dart:ffi
import 'dart:ffi';
import 'package:ffi/ffi.dart';

typedef NativeAdd = Int32 Function(Int32, Int32);
typedef DartAdd = int Function(int, int);

final dylib = DynamicLibrary.open('libnative.so');
final add = dylib.lookupFunction<NativeAdd, DartAdd>('native_add');

// Usage
final result = add(3, 4); // 7, no async overhead
```

Use `ffigen` to auto-generate Dart bindings from C headers:
```yaml
# ffigen.yaml
output: lib/src/native_bindings.dart
headers:
  entry-points:
    - native/include/api.h
```

## Pigeon (Type-Safe Code Generation)

Pigeon generates type-safe platform channel code from a Dart schema. Eliminates string-based method names and manual serialization.

```dart
// pigeons/messages.dart
import 'package:pigeon/pigeon.dart';

class SearchResult {
  String? title;
  String? url;
  double? relevance;
}

@HostApi()
abstract class SearchApi {
  @async
  List<SearchResult> search(String query);
  void cancelSearch();
}

@FlutterApi()
abstract class SearchCallbacks {
  void onIndexingProgress(double percent);
}
```

Generate code:
```bash
dart run pigeon --input pigeons/messages.dart
```

This generates:
- Dart interface + implementation wrapper
- Kotlin implementation stub
- Swift implementation stub
- All serialization code

Benefits over raw MethodChannel:
- Compile-time type safety (no runtime casting)
- Auto-generated serialization (no manual Map construction)
- Clear API contract between Dart and native
- Null safety enforced

## Choosing the Right Mechanism

| Mechanism | Latency | Use Case | Complexity |
|-----------|---------|----------|-----------|
| MethodChannel | ~0.1ms | Simple native calls | Low |
| EventChannel | ~0.1ms | Native-to-Dart streams | Low |
| Pigeon | ~0.1ms | Type-safe channels (any direction) | Medium |
| FFI | ~0.001ms | High-perf C interop | High |
| Platform Views | N/A | Embedding native UI widgets | High |

## Best Practices

1. Use Pigeon for any non-trivial channel interface (>2 methods)
2. Keep channel names namespaced: `com.company.app/feature`
3. Handle errors on both sides -- native exceptions don't auto-propagate
4. Test native code independently with platform-specific test frameworks
5. Use `BasicMessageChannel` for simple key-value messaging without method semantics
6. Consider isolates + FFI for CPU-heavy work instead of platform channels
