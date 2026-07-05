---
type: fact
title: "Mobile Testing in CI"
---

# Mobile Testing in CI

## Framework Comparison

| Framework | Platform | Language | Speed | Reliability |
|---|---|---|---|---|
| Detox | React Native (iOS/Android) | JavaScript | Fast (grey-box) | High |
| XCUITest | iOS native | Swift | Medium | High |
| Espresso | Android native | Kotlin/Java | Fast (white-box) | High |
| Appium | Cross-platform | Any | Slow (black-box) | Medium |
| Maestro | Cross-platform | YAML | Medium | Medium-High |

## Detox in CI

### Setup for CI
```yaml
# GitHub Actions example
jobs:
  e2e-ios:
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4
      - name: Install deps
        run: npm ci
      - name: Build for testing
        run: npx detox build --configuration ios.sim.release
      - name: Boot simulator
        run: |
          xcrun simctl boot "iPhone 15"
          xcrun simctl bootstatus "iPhone 15" -b
      - name: Run tests
        run: npx detox test --configuration ios.sim.release --headless
```

### Detox Best Practices for CI
- Use `release` configuration (faster, closer to production)
- Pre-build app artifacts and cache them
- Use `--headless` flag to avoid display requirements
- Set `detox.config.js` retry count to 2 for CI
- Use artifacts on failure: screenshots + video + logs

## XCUITest in CI

### Xcode Cloud / GitHub Actions
```yaml
- name: Run UI Tests
  run: |
    xcodebuild test \
      -project App.xcodeproj \
      -scheme "AppUITests" \
      -destination "platform=iOS Simulator,name=iPhone 15,OS=17.4" \
      -resultBundlePath TestResults.xcresult \
      -retry-tests-on-failure \
      -test-iterations 2
```

### Key Considerations
- macOS runners required (expensive in cloud CI)
- Simulator boot time: 30-60s (factor into timeouts)
- Parallel test plans reduce total time
- `xcresult` bundles contain screenshots + diagnostics

## Espresso in CI

### Android Emulator Setup
```yaml
jobs:
  android-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: AVD cache
        uses: actions/cache@v4
        with:
          path: ~/.android/avd
          key: avd-api-34
      - name: Start emulator
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          arch: x86_64
          script: ./gradlew connectedAndroidTest
```

### Espresso Optimizations
- Use `androidx.test.orchestrator` for test isolation
- Enable hardware acceleration (`-gpu swiftshader_indirect`)
- Disable animations: `adb shell settings put global window_animation_scale 0`
- Shard tests across multiple emulators

## Simulator/Emulator Management in Pipelines

### iOS Simulators
- Pre-create and snapshot simulators to reduce boot time
- Use `simctl` to manage lifecycle: create, boot, shutdown, delete
- Clean simulator between test suites: `xcrun simctl erase`
- Cache simulator runtime downloads (large: ~5GB)

### Android Emulators
- AVD snapshots for instant boot (`-no-snapshot-save -snapshot boot`)
- Headless mode: `-no-window -no-audio`
- Allocate sufficient RAM: minimum 2GB for emulator
- KVM acceleration on Linux runners (10x faster than software emulation)

## Device Farms

### Cloud Options

| Service | Platforms | Real Devices | Parallelism | Pricing Model |
|---|---|---|---|---|
| AWS Device Farm | iOS/Android | Yes | High | Per-minute |
| Firebase Test Lab | Android (+ iOS beta) | Yes | Medium | Spark/Blaze |
| BrowserStack | iOS/Android | Yes | High | Per-parallel |
| Sauce Labs | iOS/Android | Yes | High | Per-parallel |
| LambdaTest | iOS/Android | Yes | High | Per-parallel |

### When to Use Device Farms vs Local Simulators
- **Simulators**: fast feedback, cheap, good for most logic testing
- **Real devices**: hardware-specific bugs, performance testing, final validation
- **Strategy**: 80% simulator in CI, 20% real devices in nightly/pre-release

### Device Farm Integration
```yaml
# Firebase Test Lab example
- name: Run on real devices
  run: |
    gcloud firebase test android run \
      --type instrumentation \
      --app app/build/outputs/apk/debug/app-debug.apk \
      --test app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk \
      --device model=Pixel6,version=34 \
      --device model=SamsungGalaxyS23,version=33 \
      --timeout 10m \
      --results-dir=test-results
```

## CI Pipeline Architecture

### Recommended Flow
```
Build → Unit Tests → Simulator E2E → (gate) → Device Farm → Deploy
         (fast)       (medium)                    (slow/nightly)
```

### Parallelization Strategy
- Shard test suites by feature area
- Run iOS and Android in parallel jobs
- Use test impact analysis to skip unaffected tests
- Cache build artifacts between stages

### Flakiness Management
- Quarantine flaky tests (run but don't block)
- Auto-retry with 2 attempts max
- Track flake rate per test over time
- Root-cause analysis threshold: >5% flake rate = mandatory fix

## Common CI Pitfalls

- Emulator/simulator timeout during boot (increase wait, use snapshots)
- Insufficient disk space for simulators (clean up between runs)
- Network-dependent tests failing (mock network layer)
- Time zone differences between CI and local (set explicit TZ)
- Stale caches causing build failures (version-key your caches)
- macOS runner availability/cost (consider self-hosted for high volume)
