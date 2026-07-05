---
type: subskill
title: "Device Farms"
---

# Device Farms

## BrowserStack App Automate

```typescript
const caps = {
  'bstack:options': {
    userName: process.env.BROWSERSTACK_USER,
    accessKey: process.env.BROWSERSTACK_KEY,
    deviceName: 'Samsung Galaxy S23',
    osVersion: '13.0',
    appUrl: 'bs://app-id',
    projectName: 'MyApp',
    buildName: `build-${Date.now()}`
  }
};
```

- Parallel execution: up to plan limit (5/25/50+)
- App upload: `curl -u "user:key" -X POST https://api-cloud.browserstack.com/app-automate/upload -F "file=@app.apk"`
- Network logs, video, device logs available post-session
- Local testing: `BrowserStackLocal` binary for staging environments

## Sauce Labs

```typescript
const caps = {
  platformName: 'Android',
  'appium:deviceName': 'Google Pixel.*',
  'appium:platformVersion': '13',
  'sauce:options': {
    appiumVersion: '2.0',
    name: 'Login Flow',
    build: process.env.CI_BUILD_ID
  }
};
```

- Real device cloud + emulators/simulators
- Extended debugging: HAR capture, JS console logs
- Insights dashboard: flakiness detection, trends

## AWS Device Farm

```yaml
# devicefarm project setup via CLI
aws devicefarm create-project --name "MyApp"
aws devicefarm create-upload --project-arn <arn> --name app.apk --type ANDROID_APP
```

- Flat pricing: $0.17/device-minute or unlimited plan
- Integrates with CodePipeline/CodeBuild
- Custom test environments (Appium, Espresso, XCTest)
- Device slots: reserve specific devices for consistency

## Self-Hosted

- **Selenium Grid 4 + Appium**: hub distributes to Appium nodes with connected devices
- **STF (Smartphone Test Farm)**: open-source device management, web UI
- Cost-effective at scale (30+ devices), high maintenance overhead
- Requires: USB hub, device power management, network stability

## Cost Optimization

- **Device matrix**: test on 3-5 representative devices, not all models
- **Tier strategy**: smoke on 2 devices per commit, full suite nightly on 10+
- **Parallel execution**: reduces wall-clock time, same device-minutes
- **Caching**: reuse app upload IDs within same build
- **Sharding**: split test suite by module, run shards in parallel

## Sharding Strategies

```yaml
# Split by test file count
shard_1: tests/auth/**
shard_2: tests/checkout/**
shard_3: tests/profile/**

# Split by estimated duration
# Use historical run times to balance shards evenly
```

## Debugging Remote Failures

- **Video**: every session recorded, correlate timestamp with failure
- **Device logs**: adb logcat (Android), syslog (iOS)
- **Network**: HAR files or proxy logs for API failures
- **Screenshots**: on failure auto-capture, compare with baseline
- **Session metadata**: capabilities, Appium log, server-side logs
