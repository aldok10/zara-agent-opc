# Subskill: Mobile Testing

> Activate when: mobile, Appium, Maestro, iOS, Android, native app, device farm, gesture, deep link, React Native, Flutter, Detox, biometric
>
> Real devices for critical flows. W3C Actions for gestures. Explicit waits only. Cover n-2 OS versions. Maestro for low-flake E2E.

## Golden Rules

1. Framework selection: Maestro for E2E flows, Appium for complex cross-platform, Detox for RN, native XCTest/Espresso for unit
2. Real devices for critical flows (emulators for dev speed)
3. Device matrix: top 5 devices per platform by user analytics
4. Gestures: W3C Actions API (deprecated TouchAction removed)
5. Wait strategy: explicit waits on element state (never sleep)
6. Deep link testing: verify Universal Links and App Links end-to-end
7. Network conditioning: test offline, slow 3G, connection switching
8. App lifecycle: background/foreground, interrupts (calls, notifications)
9. Permission dialogs handled programmatically
10. Separate suites: smoke (fast, 5min) and regression (full, 30min)

## Cross-Platform Framework Selection

| Framework | Best For | Flakiness | Setup |
|-----------|----------|-----------|-------|
| Maestro | E2E flows, onboarding, critical paths | <2% | YAML, no code |
| Appium 2 | Complex multi-platform, device farms | 5-15% | Server + driver |
| Detox | React Native (gray-box) | Low | RN-only |
| XCTest/Espresso | Native unit/UI (fastest) | Lowest | Platform-specific |
| Patrol | Flutter native interaction | Low | Flutter-only |

Decision: start with Maestro for flow coverage, add Appium only for device farm / advanced gestures.

## Maestro Framework

```yaml
# flow: login.yaml — readable, <2% flake rate
appId: com.example.app
---
- launchApp
- tapOn: "Email"
- inputText: "user@example.com"
- tapOn: "Password"
- inputText: "secret123"
- tapOn: "Sign In"
- assertVisible: "Welcome back"

# Swipe gesture
- swipe:
    direction: LEFT
    duration: 500

# Conditional + retry
- tapOn:
    text: "Allow"
    optional: true  # skip if not present (permission dialogs)
```

- Supports: iOS, Android, Flutter, React Native
- CI: `maestro test flows/ --format junit`
- Sharding: `maestro test --shard-all 4` for parallel execution
- Record: `maestro record` for visual debugging

## Flutter Testing

```dart
// Unit test (flutter_test)
testWidgets('counter increments', (tester) async {
  await tester.pumpWidget(MyApp());
  await tester.tap(find.byIcon(Icons.add));
  await tester.pump();
  expect(find.text('1'), findsOneWidget);
});

// Integration test (integration_test package)
// test/integration_test/app_test.dart
import 'package:integration_test/integration_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('full flow', (tester) async {
    await tester.pumpWidget(MyApp());
    await tester.tap(find.text('Login'));
    await tester.pumpAndSettle();
    expect(find.text('Dashboard'), findsOneWidget);
  });
}
```

- **Patrol**: when Flutter tests need native OS interaction (permissions, notifications)
- Run: `patrol test -t integration_test/app_test.dart`

## Appium 2 Setup

```javascript
const capabilities = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': 'Pixel 7',
  'appium:app': '/path/to/app.apk',
  'appium:autoGrantPermissions': true,
  'appium:newCommandTimeout': 300,
};
```

## Locator Strategy

```javascript
// Priority: accessibility ID > resource-id > XPath (last resort)
await driver.$('~login-button');                          // accessibility ID
await driver.$('android=new UiSelector().resourceId("com.app:id/login")');
await driver.$('-ios predicate string:name == "Login"');
// AVOID: XPath (slow, brittle)
```

## App Performance Profiling

| Tool | Platform | Measures |
|------|----------|----------|
| Flashlight | iOS/Android | Startup, FPS, bundle size (mobile Lighthouse) |
| systrace | Android | CPU, thread scheduling, render jank |
| Instruments | iOS | Time Profiler, Allocations, Energy |
| Android Profiler | Android | Memory, CPU, network in real-time |

```bash
# Flashlight: measure startup time + FPS
npx @bamlab/flashlight measure --bundleId com.example.app
npx @bamlab/flashlight report  # generates HTML report

# systrace capture
python systrace.py -t 5 gfx view wm am
```

## Push Notification Testing

```javascript
// Appium: send test push via FCM
await fetch('https://fcm.googleapis.com/fcm/send', {
  method: 'POST',
  headers: { Authorization: `key=${FCM_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ to: deviceToken, notification: { title: 'Test', body: 'Tap me' } })
});

// Verify notification appeared
await driver.openNotifications();
await driver.$('~Test').waitForDisplayed();
await driver.$('~Test').click();
// Verify deep link destination after tap
```

- Permission states: test granted, denied, not-determined
- iOS: use APNs sandbox + device token from test build
- Background vs foreground delivery: test both paths

## Biometric Testing

```javascript
// Appium: enroll biometric on simulator/emulator
await driver.execute('mobile:enrollBiometric', { isEnabled: true });

// Trigger biometric prompt, then authenticate
await driver.$('~biometric-login').click();
await driver.execute('mobile:sendBiometricMatch', { match: true });
// Test failure path
await driver.execute('mobile:sendBiometricMatch', { match: false });
```

- Simulators only: real devices need physical finger/face
- iOS Simulator: `Features > Face ID > Enrolled`
- Android Emulator: `Extended Controls > Fingerprint`
- Always test fallback path (PIN/password after biometric failure)

## Deep Link Testing

```yaml
# Maestro: deep link verification
- openLink: "https://app.example.com/product/123"
- assertVisible: "Product Details"

# Maestro: custom scheme
- openLink: "myapp://settings/notifications"
- assertVisible: "Notification Preferences"
```

```javascript
// Appium: Universal Links (iOS) / App Links (Android)
await driver.execute('mobile:deepLink', {
  url: 'https://app.example.com/product/123',
  package: 'com.example.app'  // Android only
});
await driver.$('~product-title').waitForDisplayed();
```

- **Universal Links (iOS)**: verify apple-app-site-association hosted at `/.well-known/`
- **App Links (Android)**: verify `assetlinks.json` at `/.well-known/`
- **Deferred deep links**: test install-then-open flow (first-time user gets routed correctly after store install)
- Test: link in browser, link in email, link from push notification

## Network Conditioning

```javascript
await driver.toggleAirplaneMode();
await driver.setNetworkConnection(4);  // data only, no wifi
// BrowserStack: 'bstack:options': { networkProfile: '3g-lossy' }
```

## Device Farm Integration

| Provider | Strength | Pricing Model |
|----------|----------|---------------|
| BrowserStack | Largest device catalog | Per-minute |
| Sauce Labs | Best debugging tools | Per-minute |
| AWS Device Farm | AWS-native, predictable | Per-device-minute |
| Self-hosted (STF) | Control, no recurring cost | Infra maintenance |

## Anti-Patterns

- `Thread.sleep` / static waits (use explicit waits)
- Only latest OS version (cover n-2)
- Ignoring orientation changes
- Hardcoded device capabilities (use config profiles)
- XPath as primary locator (slow, brittle)
- Skip install/upgrade path testing
- Using Appium for simple flows where Maestro suffices

## Delegates To

- **performance-testing** for app startup time, memory profiling
- **accessibility-testing** for TalkBack/VoiceOver mobile a11y
- **api-testing** for backend API testing alongside mobile
