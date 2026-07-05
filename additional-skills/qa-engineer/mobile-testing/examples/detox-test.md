---
type: example
title: "Detox E2E Test for React Native Login Flow"
---

# Detox E2E Test for React Native Login Flow

## Context
When testing critical user flows on React Native apps that must work reliably across iOS and Android. Detox runs on real simulators/emulators with gray-box testing—it understands app idle state, so no arbitrary sleeps needed.

## Code/Template

```typescript
// e2e/auth/login.test.ts
import { by, device, element, expect, waitFor } from 'detox';

describe('Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES' },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('shows login screen on first launch', async () => {
    await expect(element(by.id('login-screen'))).toBeVisible();
    await expect(element(by.id('email-input'))).toBeVisible();
    await expect(element(by.id('password-input'))).toBeVisible();
    await expect(element(by.id('login-button'))).toBeVisible();
  });

  it('shows validation errors for empty fields', async () => {
    await element(by.id('login-button')).tap();

    await expect(element(by.id('email-error'))).toHaveText('Email is required');
    await expect(element(by.id('password-error'))).toHaveText('Password is required');
  });

  it('shows error for invalid email format', async () => {
    await element(by.id('email-input')).typeText('not-an-email');
    await element(by.id('password-input')).typeText('validpass123');
    await element(by.id('login-button')).tap();

    await expect(element(by.id('email-error'))).toHaveText('Enter a valid email');
  });

  it('shows error toast on invalid credentials', async () => {
    await element(by.id('email-input')).typeText('user@example.com');
    await element(by.id('password-input')).typeText('wrongpassword');
    await element(by.id('login-button')).tap();

    await waitFor(element(by.id('error-toast')))
      .toBeVisible()
      .withTimeout(5000);

    await expect(element(by.id('error-toast'))).toHaveText(
      'Invalid email or password'
    );
  });

  it('navigates to home on successful login', async () => {
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('correct-password');
    await element(by.id('login-button')).tap();

    // Wait for navigation to complete
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(10000);

    await expect(element(by.id('welcome-message'))).toHaveText(
      'Welcome back, Test User'
    );
  });

  it('persists session after app relaunch', async () => {
    // Login first
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('correct-password');
    await element(by.id('login-button')).tap();

    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(10000);

    // Relaunch without clearing state
    await device.launchApp({ newInstance: false });

    // Should still be on home screen
    await expect(element(by.id('home-screen'))).toBeVisible();
    await expect(element(by.id('login-screen'))).not.toBeVisible();
  });

  it('handles biometric login when available', async () => {
    // Enroll biometric on simulator
    await device.setBiometricEnrollment(true);

    await element(by.id('biometric-login-button')).tap();

    // Simulate successful biometric match
    await device.matchFace(); // or device.matchFinger() for Touch ID

    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('handles network offline gracefully', async () => {
    await device.disableSynchronization();
    await device.setURLBlacklist(['.*api.example.com.*']);

    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('correct-password');
    await element(by.id('login-button')).tap();

    await waitFor(element(by.id('offline-banner')))
      .toBeVisible()
      .withTimeout(5000);

    await expect(element(by.id('offline-banner'))).toHaveText(
      'No internet connection'
    );

    await device.enableSynchronization();
    await device.setURLBlacklist([]);
  });
});
```

```json
// .detoxrc.js (relevant config section)
{
  "testRunner": {
    "args": { "$0": "jest", "config": "e2e/jest.config.js" },
    "jest": { "setupTimeout": 120000 }
  },
  "apps": {
    "ios.release": {
      "type": "ios.app",
      "binaryPath": "ios/build/MyApp.app",
      "build": "xcodebuild -workspace ios/MyApp.xcworkspace -scheme MyApp -configuration Release -sdk iphonesimulator -derivedDataPath ios/build"
    }
  },
  "devices": {
    "simulator": { "type": "ios.simulator", "device": { "type": "iPhone 15" } }
  }
}
```

## Key Points
- Use `testID` props consistently in React Native components—they map to `by.id()` selectors and work cross-platform
- Prefer `waitFor().toBeVisible().withTimeout()` over arbitrary delays; Detox auto-waits for animations but not network
- Test session persistence with `device.launchApp({ newInstance: false })` to verify token storage survives app lifecycle
