---
type: subskill
title: "Android Testing"
---

# Android Testing

## UiAutomator2 Driver

Configure Appium with UiAutomator2:
```json
{
  "platformName": "Android",
  "appium:automationName": "UiAutomator2",
  "appium:deviceName": "Pixel_7_API_34",
  "appium:app": "/path/to/app-debug.apk",
  "appium:appWaitActivity": "com.myapp.MainActivity",
  "appium:noReset": false
}
```

Performance tuning capabilities:
- `skipServerInstallation`: skip UiAutomator2 server reinstall
- `disableWindowAnimation`: faster test execution
- `skipDeviceInitialization`: skip device ready checks
- `uiautomator2ServerLaunchTimeout`: increase for slow emulators

## Emulator Management

```bash
# List AVDs
emulator -list-avds

# Create AVD
avdmanager create avd -n "Test_Pixel7" -k "system-images;android-34;google_apis;x86_64" -d pixel_7

# Start emulator (headless for CI)
emulator -avd Test_Pixel7 -no-window -no-audio -gpu swiftshader_indirect

# Snapshot: save and load state
adb emu avd snapshot save clean_state
adb emu avd snapshot load clean_state

# Wait for boot
adb wait-for-device shell 'while [[ -z $(getprop sys.boot_completed) ]]; do sleep 1; done'
```

## ADB Commands

```bash
# Install APK
adb install -r app-debug.apk

# Capture logs (filtered)
adb logcat -s "MyApp:V" --format=time

# Screen record
adb shell screenrecord /sdcard/test.mp4 --time-limit 60

# Pull files from device
adb pull /sdcard/test.mp4 ./artifacts/

# Push files to device
adb push testdata.json /sdcard/Download/

# Clear app data
adb shell pm clear com.myapp.package
```

## Permission Handling

Auto-grant all permissions at install:
```json
{
  "appium:autoGrantPermissions": true
}
```

Handle runtime permission dialogs:
```ts
// Click "Allow" on permission dialog
const allowBtn = await driver.$('//*[@resource-id="com.android.permissioncontroller:id/permission_allow_button"]')
await allowBtn.click()

// Or use ADB to grant specific permission
await driver.execute('mobile: shell', {
  command: 'pm', args: ['grant', 'com.myapp', 'android.permission.CAMERA']
})
```

## Deep Links (App Links)

```ts
// Open deep link via ADB intent
await driver.execute('mobile: deepLink', {
  url: 'https://myapp.com/product/123',
  package: 'com.myapp.package'
})

// Verify handling
const screen = await driver.$('~product-detail')
await expect(screen).toBeDisplayed()
```

Verify App Links:
```bash
adb shell am start -a android.intent.action.VIEW -d "https://myapp.com/path" com.myapp.package
adb shell dumpsys package domain-preferred-apps
```

## Network Configuration

Proxy setup for traffic inspection:
```bash
# Set proxy on emulator
adb shell settings put global http_proxy 10.0.2.2:8080

# Install CA certificate (Android 7+)
adb push my-ca.pem /sdcard/
adb shell am start -a android.settings.SECURITY_SETTINGS
# Manually install from storage, or use:
adb shell settings put secure install_non_market_apps 1
```

For API-level 24+, add network security config:
```xml
<!-- res/xml/network_security_config.xml (debug only) -->
<network-security-config>
  <debug-overrides>
    <trust-anchors>
      <certificates src="user" />
    </trust-anchors>
  </debug-overrides>
</network-security-config>
```

## Performance Profiling

```bash
# System trace
adb shell atrace --async_start -c -b 4096 gfx view wm am

# Memory info
adb shell dumpsys meminfo com.myapp.package

# Battery stats
adb shell dumpsys batterystats --reset
# ... run tests ...
adb shell dumpsys batterystats com.myapp.package

# CPU info
adb shell top -n 1 | grep com.myapp
```
