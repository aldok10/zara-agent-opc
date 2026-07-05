---
type: subskill
title: "Shared UI Strategy"
---

# Shared UI Strategy

When to share UI across platforms, trade-offs of shared vs native UI, and implementation patterns.

## When to Load

- Deciding whether to share UI code between platforms
- Evaluating trade-offs of consistent UI vs native feel
- Implementing design systems that work across platforms
- Handling platform-specific UI requirements within shared codebases

## Key Concepts

**Share UI When**
- Brand consistency matters more than platform conventions
- UI is highly custom (not standard platform patterns)
- Small team needs to ship quickly to both platforms
- App is content-focused (media, social, e-commerce browsing)
- Design system is already platform-agnostic

**Keep UI Native When**
- Platform-native feel is a product requirement
- Heavy use of platform-specific patterns (iOS swipe actions, Android back)
- Accessibility must match platform expectations exactly
- UI is primarily standard components (settings, forms, lists)
- Team has strong native developers for both platforms

**Shared UI Approaches**
- Flutter: custom rendering engine, same pixels on all platforms
- React Native: maps to native components (platform-adaptive)
- Compose Multiplatform: Jetpack Compose on iOS (experimental)
- Web-based (Capacitor/Cordova): web UI in native wrapper (worst performance)

**Platform Adaptation Patterns**
- Adaptive components: same component, different behavior per platform
- Platform-specific overrides: shared default with platform customization
- Design tokens: colors, spacing, typography abstracted from implementation
- Navigation patterns: tab bar (iOS) vs bottom nav (Android) vs shared

## Patterns

```dart
// Flutter: adaptive platform behavior
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';

class AdaptiveButton extends StatelessWidget {
  final String label;
  final VoidCallback onPressed;

  const AdaptiveButton({required this.label, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    if (Platform.isIOS) {
      return CupertinoButton(
        onPressed: onPressed,
        child: Text(label),
      );
    }
    return ElevatedButton(
      onPressed: onPressed,
      child: Text(label),
    );
  }
}
```

```typescript
// React Native: platform-specific components
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.select({ ios: 44, android: 0 }),
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 4 },
    }),
  },
});

// Platform-specific file resolution
// Button.ios.tsx  -- used on iOS
// Button.android.tsx  -- used on Android
// import Button from './Button';  -- auto-resolves per platform
```

**Design System Architecture**
```
Shared:
  - Design tokens (colors, spacing, typography, elevation)
  - Component API contracts (props/parameters)
  - Layout logic and responsive breakpoints
  - Animation timing curves

Platform-specific:
  - Rendering implementation (widgets/components)
  - Navigation transitions
  - Haptic feedback patterns
  - System UI integration (status bar, keyboard)
```

**Progressive Sharing Strategy**
1. Start with shared business logic (non-UI)
2. Share design tokens and theming
3. Share simple UI components (buttons, inputs, cards)
4. Keep complex interactions native (navigation, gestures, animations)
5. Evaluate: is sharing the complex parts worth the trade-offs?

## Gotchas

- Shared UI that ignores platform conventions feels wrong to users
- Flutter on iOS: scroll physics, navigation patterns differ from native feel
- React Native new architecture (Fabric) changes how native modules integrate
- Compose Multiplatform on iOS is not production-ready yet (verify latest status)
- Shared UI doesn't mean shared UX -- user expectations differ between platforms
- Accessibility APIs differ significantly -- shared UI needs platform-specific a11y work

## Verification

- UI renders correctly on both platforms (visual regression testing)
- Platform-specific behaviors work (back gesture, swipe actions, pull-to-refresh)
- Accessibility audit passes on both platforms (VoiceOver, TalkBack)
- Performance: 60fps on target devices for scrolling and animations
- Design review: shared UI meets both platform design guidelines where needed
