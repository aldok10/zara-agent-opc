---
type: subskill
title: "Appium Setup"
---

# Appium Setup

## Installation (Appium 2)

```bash
npm install -g appium
appium driver install uiautomator2  # Android
appium driver install xcuitest       # iOS

# Verify
appium driver list --installed
appium --version
```

## Driver Management

```bash
appium driver install <driver>
appium driver update <driver>
appium driver list                   # all available
appium driver list --installed       # installed only
appium plugin install images         # optional plugins
```

## Server Startup

```bash
# Default
appium server --port 4723

# With plugins
appium server --use-plugins=images --port 4723

# Allow CORS for Inspector
appium server --allow-cors
```

## W3C Capabilities (Vendor Prefix Required)

```typescript
// Android - UiAutomator2
const androidCaps = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': 'Pixel_7_API_34',
  'appium:app': '/path/to/app.apk',
  'appium:autoGrantPermissions': true,
  'appium:newCommandTimeout': 300,
  'appium:noReset': false
};

// iOS - XCUITest
const iosCaps = {
  platformName: 'iOS',
  'appium:automationName': 'XCUITest',
  'appium:deviceName': 'iPhone 15 Pro',
  'appium:platformVersion': '17.4',
  'appium:app': '/path/to/app.ipa',
  'appium:udid': 'auto',
  'appium:xcodeOrgId': '<TEAM_ID>',
  'appium:xcodeSigningId': 'iPhone Developer'
};
```

## Session Management

```typescript
import { remote } from 'webdriverio';

const driver = await remote({
  hostname: '127.0.0.1',
  port: 4723,
  path: '/',
  capabilities: androidCaps
});

// Set timeouts
await driver.setTimeout({ implicit: 10000 });

// Cleanup
await driver.deleteSession();
```

## Appium Inspector

- Download from: github.com/appium/appium-inspector
- Connect to running server: `127.0.0.1:4723`
- Use for element locator identification
- Supports: id, xpath, accessibility id, class chain (iOS), uiautomator (Android)
- Record actions to generate test code

## Common Issues

| Issue | Fix |
|-------|-----|
| ANDROID_HOME not set | Export in shell profile, verify `adb devices` works |
| Xcode command line tools | `xcode-select --install`, accept license |
| WebDriverAgent build fails | Open WDA project in Xcode, set signing team |
| Session creation timeout | Increase `appium:newCommandTimeout`, check emulator boot |
| Element not found | Use explicit waits, verify with Inspector |
| Permission dialogs | `appium:autoGrantPermissions` or handle alerts |

## Environment Verification

```bash
# Check all dependencies
npx appium-doctor --android
npx appium-doctor --ios

# Required env vars
export ANDROID_HOME=$HOME/Library/Android/sdk
export JAVA_HOME=$(/usr/libexec/java_home)
export PATH=$PATH:$ANDROID_HOME/platform-tools
```
