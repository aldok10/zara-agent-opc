---
type: fact
title: "Mobile Testing Patterns"
---

# Mobile Testing Patterns

## Gesture Testing

### Common Gestures to Test
| Gesture | Use Case | Automation |
|---------|----------|------------|
| Tap | Button press, selection | `element.click()` |
| Long press | Context menu, drag start | `driver.touchAction({action: 'longPress', element})` |
| Swipe | List scroll, carousel, dismiss | `driver.touchAction([{action: 'press', x, y}, {action: 'moveTo', x, y}, 'release'])` |
| Pinch | Zoom out (maps, images) | Multi-touch action |
| Spread | Zoom in | Multi-touch action |
| Double tap | Zoom, like action | Two rapid taps |
| Pull to refresh | List refresh | Swipe down from top of list |

### Appium Gesture Examples
```typescript
// Swipe left on element (dismiss/delete)
async function swipeLeft(element: WebdriverIO.Element) {
  const location = await element.getLocation();
  const size = await element.getSize();
  
  const startX = location.x + size.width * 0.8;
  const endX = location.x + size.width * 0.2;
  const y = location.y + size.height / 2;

  await driver.touchAction([
    { action: 'press', x: startX, y },
    { action: 'wait', ms: 300 },
    { action: 'moveTo', x: endX, y },
    'release'
  ]);
}

// Pull to refresh
async function pullToRefresh() {
  const { width, height } = await driver.getWindowSize();
  await driver.touchAction([
    { action: 'press', x: width / 2, y: height * 0.3 },
    { action: 'wait', ms: 500 },
    { action: 'moveTo', x: width / 2, y: height * 0.7 },
    'release'
  ]);
}

// Scroll until element visible
async function scrollToElement(selector: string) {
  let element = await $(selector);
  let attempts = 0;
  while (!(await element.isDisplayed()) && attempts < 10) {
    await driver.touchAction([
      { action: 'press', x: 200, y: 600 },
      { action: 'moveTo', x: 200, y: 300 },
      'release'
    ]);
    element = await $(selector);
    attempts++;
  }
}
```

## Deep Link Testing

### Why Test Deep Links
- Users arrive from notifications, emails, ads, other apps
- Deep links must resolve correctly even when app is not running
- State restoration: link should show correct content regardless of app state

### Test Scenarios
```typescript
describe('Deep Links', () => {
  it('opens product page from cold start', async () => {
    // Terminate app if running
    await driver.terminateApp('com.example.app');
    
    // Open deep link
    await driver.url('myapp://product/123');
    
    // Verify correct page loaded
    const title = await $('[data-testid="product-title"]');
    await expect(title).toHaveText('Product 123');
  });

  it('opens product page when app is backgrounded', async () => {
    // App is in background
    await driver.background(2);
    
    // Deep link brings it forward
    await driver.url('myapp://product/456');
    
    const title = await $('[data-testid="product-title"]');
    await expect(title).toHaveText('Product 456');
  });

  it('handles invalid deep link gracefully', async () => {
    await driver.url('myapp://nonexistent/page');
    
    // Should show home or error, not crash
    const home = await $('[data-testid="home-screen"]');
    await expect(home).toBeDisplayed();
  });

  it('requires auth for protected deep links', async () => {
    // Ensure logged out
    await driver.terminateApp('com.example.app');
    
    await driver.url('myapp://account/settings');
    
    // Should redirect to login
    const login = await $('[data-testid="login-screen"]');
    await expect(login).toBeDisplayed();
  });
});
```

## Offline Testing

### Scenarios to Cover
1. App starts with no network → graceful error/cached content
2. Network drops mid-operation → queue/retry/error message
3. Network returns → sync pending operations
4. Slow network (2G simulation) → loading states, timeouts handled

### Implementation
```typescript
describe('Offline Behavior', () => {
  it('shows cached content when offline', async () => {
    // Load data while online
    await $('[data-testid="feed"]').waitForDisplayed();
    
    // Go offline
    await driver.setNetworkConnection(0); // airplane mode
    
    // Navigate away and back
    await $('[data-testid="settings-tab"]').click();
    await $('[data-testid="feed-tab"]').click();
    
    // Cached content still visible
    await expect($('[data-testid="feed-item"]')).toBeDisplayed();
    await expect($('[data-testid="offline-banner"]')).toBeDisplayed();
  });

  it('queues actions and syncs when online', async () => {
    await driver.setNetworkConnection(0); // offline
    
    // Perform action
    await $('[data-testid="like-btn"]').click();
    await expect($('[data-testid="pending-indicator"]')).toBeDisplayed();
    
    // Restore network
    await driver.setNetworkConnection(6); // wifi + data
    
    // Verify sync
    await $('[data-testid="pending-indicator"]').waitForDisplayed({ reverse: true });
  });

  it('handles timeout on slow network', async () => {
    // Simulate 2G via network conditioning
    await driver.setNetworkConnection(2); // 2G
    
    await $('[data-testid="load-more"]').click();
    
    // Should show loading then timeout message
    await expect($('[data-testid="timeout-message"]')).toBeDisplayed({ timeout: 30000 });
  });
});
```

## Push Notification Testing

```typescript
describe('Push Notifications', () => {
  it('navigates to correct screen on tap', async () => {
    // Send test notification (via backend API)
    await fetch(`${API_URL}/test/send-notification`, {
      method: 'POST',
      body: JSON.stringify({
        token: deviceToken,
        title: 'New message',
        data: { screen: 'chat', chatId: '42' }
      })
    });

    // Wait for and tap notification
    const notification = await driver.getNotifications();
    await notification[0].click();

    // Verify navigation
    const chatScreen = await $('[data-testid="chat-42"]');
    await expect(chatScreen).toBeDisplayed();
  });
});
```

## Platform-Specific Concerns

### iOS
- Permission dialogs (camera, location, notifications)  -  must handle in tests
- App Transport Security (HTTPS requirements)
- Background app refresh behavior
- Face ID / Touch ID flows (use simulated biometrics)

### Android
- Permission model differs by OS version
- Back button behavior (hardware/gesture)
- App killed by OS memory pressure (state restoration)
- Split-screen / multi-window
- Various manufacturer skins (Samsung One UI, MIUI, etc.)

## Performance on Mobile

### What to Measure
- Cold start time (< 2s target)
- Screen transition time (< 300ms target)
- Memory usage (watch for leaks on repeated navigation)
- Battery drain during background operations
- Frame rate during animations (60fps target)

### Tools
- Android: Android Studio Profiler, systrace
- iOS: Instruments (Time Profiler, Allocations, Energy Log)
- Cross-platform: Flipper, React Native Performance Monitor
