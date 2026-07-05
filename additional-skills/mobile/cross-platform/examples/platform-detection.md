---
type: example
title: "Cross-Platform: Platform Detection & Adaptive UI"
---

# Platform Detection & Adaptive UI

## React Native

```typescript
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.select({
      ios: 44,
      android: 0,
      default: 0,
    }),
  },
  shadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
});

// File-based platform split: Button.ios.tsx / Button.android.tsx
// Import resolves automatically: import Button from './Button';
```

## Flutter

```dart
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

Widget buildAdaptive(BuildContext context) {
  if (kIsWeb) return WebLayout();
  if (Platform.isIOS) return CupertinoLayout();
  return MaterialLayout();
}

// Adaptive widgets (auto-switch per platform)
Switch.adaptive(value: isOn, onChanged: toggle);
Slider.adaptive(value: volume, onChanged: setVolume);
```

## Kotlin Multiplatform

```kotlin
// shared/src/commonMain/kotlin/Platform.kt
expect fun platformName(): String

// shared/src/androidMain/kotlin/Platform.kt
actual fun platformName(): String = "Android ${android.os.Build.VERSION.SDK_INT}"

// shared/src/iosMain/kotlin/Platform.kt
actual fun platformName(): String = UIDevice.currentDevice.systemName()
```

## Key Patterns

- Use platform-specific files for complex divergence (not if/else chains)
- Prefer adaptive/platform-aware widgets over manual branching
- Abstract platform APIs behind interfaces in shared code
- Test on both platforms even when using cross-platform framework
