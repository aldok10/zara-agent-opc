---
type: subskill
title: "iOS Testing"
---

# iOS Testing

## XCUITest Driver

Configure Appium with XCUITest driver:
```json
{
  "platformName": "iOS",
  "appium:automationName": "XCUITest",
  "appium:deviceName": "iPhone 15 Pro",
  "appium:platformVersion": "17.4",
  "appium:app": "/path/to/MyApp.app",
  "appium:xcodeOrgId": "TEAM_ID",
  "appium:xcodeSigningId": "iPhone Developer"
}
```

Key capabilities:
- `useNewWDA`: rebuild WebDriverAgent (use when stuck)
- `wdaLaunchTimeout`: increase for slow simulator boot
- `shouldUseSingletonTestManager`: `false` for parallel execution
- `isHeadless`: run simulators without UI (CI)

## Simulator Management

```bash
# List available simulators
xcrun simctl list devices

# Create simulator
xcrun simctl create "Test-iPhone15" "iPhone 15 Pro" "iOS-17-4"

# Boot / shutdown
xcrun simctl boot <device-id>
xcrun simctl shutdown <device-id>

# Reset (erase all data)
xcrun simctl erase <device-id>

# Install app
xcrun simctl install <device-id> /path/to/MyApp.app
```

## Provisioning

For real device testing:
- Development certificate from Apple Developer portal
- Provisioning profile covering app bundle ID + device UDID
- WebDriverAgent signed with same team (Appium handles this)
- `xcodeOrgId` + `xcodeSigningId` in capabilities

## Permission Handling

Auto-accept alerts or handle manually:
```json
{
  "appium:autoAcceptAlerts": true,
  "appium:autoDismissAlerts": false
}
```

Specific permission handling:
```ts
// Grant location permission
await driver.execute('mobile: alert', { action: 'accept' })

// Set location simulation
await driver.setGeoLocation({ latitude: 37.7749, longitude: -122.4194, altitude: 0 })

// Notifications: use simctl
// xcrun simctl push <device-id> <bundle-id> notification.json
```

## Deep Links (Universal Links)

```ts
// Open Universal Link
await driver.url('https://myapp.com/product/123')

// Verify app handled the link
const element = await driver.$('~product-detail-screen')
await expect(element).toBeDisplayed()
```

Test with `xcrun simctl openurl`:
```bash
xcrun simctl openurl booted "https://myapp.com/deep/path"
```

## Biometric Simulation

```ts
// Enroll biometric
await driver.execute('mobile: enrollBiometric', { isEnabled: true })

// Trigger match
await driver.execute('mobile: sendBiometricMatch', { type: 'faceId', match: true })

// Trigger non-match
await driver.execute('mobile: sendBiometricMatch', { type: 'faceId', match: false })
```

Simulator must have Face ID / Touch ID enrolled via Features menu.

## Debugging

- **Xcode Instruments**: profile CPU, memory, network during test
- **Crash logs**: `~/Library/Logs/DiagnosticReports/` or `xcrun simctl diagnose`
- **System log**: `xcrun simctl spawn booted log stream --predicate 'subsystem == "com.myapp"'`
- **Screenshots**: `await driver.saveScreenshot('./debug.png')`
- **WebDriverAgent logs**: check Appium server output for WDA build/connection errors
