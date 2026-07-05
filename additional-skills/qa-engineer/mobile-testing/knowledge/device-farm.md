---
type: fact
title: "Device Farm Strategies"
---

# Device Farm Strategies

## Cloud Device Farm Options

### BrowserStack
- **Real devices**: 3000+ devices (iOS, Android)
- **Automation**: Appium, Espresso, XCUITest
- **Features**: Live testing, app automate, network simulation
- **Pricing**: Per parallel session (starts ~$29/month for manual)
- **Best for**: Teams needing broad device coverage without hardware investment

### AWS Device Farm
- **Real devices**: Hundreds of physical devices in AWS data centers
- **Automation**: Appium, Calabash, XCUITest, Espresso
- **Features**: Custom environments, network shaping, video recording
- **Pricing**: Pay per device-minute ($0.17/min) or unlimited flat rate
- **Best for**: AWS-heavy teams, private device pools, long-running test suites

### Firebase Test Lab
- **Real devices**: Google-hosted Android and iOS devices
- **Automation**: Espresso, XCUITest, Robo tests
- **Features**: AI-driven Robo testing, crash reporting integration
- **Pricing**: Free tier (5 physical devices/day), then per device-minute
- **Best for**: Android-first teams, Firebase ecosystem users

### Sauce Labs
- **Real + emulators**: 2000+ browser/device combinations
- **Automation**: Appium, Espresso, XCUITest
- **Features**: Error reporting, analytics, tunneling for local testing
- **Pricing**: Enterprise licensing
- **Best for**: Large teams needing both web and mobile in one platform

### LambdaTest
- **Real devices**: 3000+ browsers, 50+ real devices
- **Automation**: Appium-based
- **Features**: Geolocation testing, network throttling
- **Pricing**: Lower cost alternative ($15/month starting)
- **Best for**: Budget-conscious teams, web + mobile combined

## Device Selection Strategy

### Minimum Coverage Matrix
```
| Priority | Android | iOS |
|----------|---------|-----|
| P0 (must test) | Latest version, top 2 devices | Latest iOS, iPhone current-gen |
| P1 (should test) | N-1 version, mid-range device | N-1 iOS, iPhone N-1 gen |
| P2 (nice to test) | N-2 version, low-end device | N-2 iOS, iPad |
```

### Choosing Devices
1. Check your analytics: what do your actual users use?
2. Cover OS version distribution (top 80% of your traffic)
3. Include screen size extremes (smallest + largest)
4. Include one low-end device (test performance on constrained hardware)
5. Mix manufacturers on Android (Samsung, Pixel, Xiaomi differ in behavior)

### Typical Android Matrix
```
- Samsung Galaxy S24 (flagship, latest Android)
- Google Pixel 8 (stock Android, latest)
- Samsung Galaxy A54 (mid-range, common)
- Xiaomi Redmi Note 12 (budget, popular globally)
- Google Pixel 6a (older stock Android)
```

### Typical iOS Matrix
```
- iPhone 15 Pro (latest, largest)
- iPhone 14 (previous gen)
- iPhone SE 3rd gen (smallest screen, older chip)
- iPad Pro 12.9" (tablet layout testing)
```

## Local vs Cloud Decision

| Factor | Local Devices | Cloud Farm |
|--------|--------------|------------|
| Speed | Fast (no network latency) | Slower (device provisioning) |
| Coverage | Limited by hardware budget | Hundreds of devices |
| CI integration | Complex setup | Built-in |
| Cost at scale | High upfront | Monthly subscription |
| Maintenance | Your team manages | Provider manages |
| Flakiness | Lower | Higher (shared resources) |

### Hybrid Approach
- Local: Top 2-3 devices for development and debugging
- Cloud: Full matrix for CI/CD regression runs
- Emulators: Quick feedback during development (fast but imperfect)

## CI Integration Pattern

```yaml
# GitHub Actions + BrowserStack
jobs:
  mobile-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Upload app to BrowserStack
        run: |
          curl -u "$BS_USER:$BS_KEY" \
            -X POST "https://api-cloud.browserstack.com/app-automate/upload" \
            -F "file=@app/build/outputs/apk/release/app-release.apk"
      
      - name: Run Appium tests
        run: npx wdio run wdio.browserstack.conf.ts
        env:
          BROWSERSTACK_USERNAME: ${{ secrets.BS_USER }}
          BROWSERSTACK_ACCESS_KEY: ${{ secrets.BS_KEY }}
```

## Parallel Execution

```typescript
// wdio.conf.ts - Run on multiple devices in parallel
export const config: WebdriverIO.Config = {
  capabilities: [
    {
      'bstack:options': {
        deviceName: 'Samsung Galaxy S24',
        osVersion: '14.0',
        platformName: 'android'
      }
    },
    {
      'bstack:options': {
        deviceName: 'Google Pixel 8',
        osVersion: '14.0',
        platformName: 'android'
      }
    },
    {
      'bstack:options': {
        deviceName: 'iPhone 15',
        osVersion: '17',
        platformName: 'ios'
      }
    }
  ],
  maxInstances: 3, // Run all 3 in parallel
};
```

## Cost Optimization

1. Run full matrix only on merge to main (not every PR)
2. PR builds: test on 1-2 representative devices only
3. Use emulators for unit/component tests, real devices for E2E
4. Set test timeouts aggressively (fail fast on device issues)
5. Cache app builds between test runs
6. Use device farm queuing to avoid idle parallel sessions
