# Expo Patterns (2026)

## Expo Router

File-based routing for React Native, built on React Navigation.

```
app/
├── _layout.tsx          # Root layout (providers, navigation structure)
├── index.tsx            # / route
├── (tabs)/
│   ├── _layout.tsx      # Tab navigator layout
│   ├── home.tsx         # /home tab
│   ├── orders.tsx       # /orders tab
│   └── profile.tsx      # /profile tab
├── orders/
│   └── [id].tsx         # /orders/:id (dynamic route)
├── (auth)/
│   ├── _layout.tsx      # Auth group layout (no tabs)
│   ├── login.tsx        # /login
│   └── register.tsx     # /register
└── +not-found.tsx       # 404 catch-all
```

### Navigation

```typescript
import { router, useLocalSearchParams, Link } from 'expo-router';

// Programmatic navigation
router.push('/orders/123');
router.replace('/home');
router.back();

// Type-safe params
export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // ...
}

// Link component (prefetch-capable)
<Link href={{ pathname: '/orders/[id]', params: { id: order.id } }}>
  <OrderCard order={order} />
</Link>
```

### Layouts

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="orders/[id]" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: HomeIcon }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: OrderIcon }} />
    </Tabs>
  );
}
```

### Route Groups

- `(groupName)` -- groups routes without affecting URL (for shared layouts)
- `(auth)` -- typical for unauthenticated flow
- `(tabs)` -- typical for main tab navigation

## Config Plugins

Modify native project configuration without ejecting. Used for permissions, build settings, native SDK integration.

```typescript
// plugins/withCustomScheme.ts
import { ConfigPlugin, withInfoPlist, withAndroidManifest } from 'expo/config-plugins';

const withCustomScheme: ConfigPlugin<{ scheme: string }> = (config, { scheme }) => {
  config = withInfoPlist(config, (config) => {
    config.modResults.CFBundleURLTypes = [
      ...(config.modResults.CFBundleURLTypes ?? []),
      { CFBundleURLSchemes: [scheme] },
    ];
    return config;
  });

  config = withAndroidManifest(config, (config) => {
    const mainActivity = config.modResults.manifest.application?.[0]?.activity?.[0];
    if (mainActivity) {
      mainActivity['intent-filter'] = [
        ...(mainActivity['intent-filter'] ?? []),
        {
          action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
          category: [
            { $: { 'android:name': 'android.intent.category.DEFAULT' } },
            { $: { 'android:name': 'android.intent.category.BROWSABLE' } },
          ],
          data: [{ $: { 'android:scheme': scheme } }],
        },
      ];
    }
    return config;
  });

  return config;
};

export default withCustomScheme;
```

Usage in app.config.ts:
```typescript
export default ({ config }) => ({
  ...config,
  plugins: [
    ['./plugins/withCustomScheme', { scheme: 'myapp' }],
    'expo-camera',
    ['expo-notifications', { icon: './assets/notification-icon.png' }],
  ],
});
```

## EAS (Expo Application Services)

### EAS Build

```json
// eas.json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview"
    },
    "production": {
      "channel": "production",
      "autoIncrement": true
    }
  }
}
```

```bash
eas build --platform ios --profile preview
eas build --platform android --profile production
```

### EAS Update (OTA)

```bash
eas update --branch preview --message "Fix checkout bug"
```

Update channels:
- `production` -- stable release builds check this
- `preview` -- internal testing builds
- Development builds can be pointed to any branch

### EAS Submit

```bash
eas submit --platform ios --latest
eas submit --platform android --latest
```

## Environment Variables

```typescript
// app.config.ts
export default {
  extra: {
    apiUrl: process.env.API_URL ?? 'https://api.example.com',
    sentryDsn: process.env.SENTRY_DSN,
  },
};

// Usage in app
import Constants from 'expo-constants';
const apiUrl = Constants.expoConfig?.extra?.apiUrl;
```

For secrets (not bundled in client):
```bash
eas secret:create --name API_SECRET --value "..." --scope project
```

## Common Patterns

- Use `expo-secure-store` for tokens (not AsyncStorage)
- Use `expo-image` over `Image` for better caching and performance
- Use `expo-haptics` for tactile feedback on interactions
- Use `expo-splash-screen` with `SplashScreen.preventAutoHideAsync()` for controlled splash
- Use `expo-updates` hooks (`useUpdates()`) for in-app update prompts
