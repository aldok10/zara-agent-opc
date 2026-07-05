---
type: subskill
title: "Navigation"
---

# Navigation

## Core Concepts

- React Navigation is the standard: stack, tab, and drawer navigators compose into navigation trees
- Navigation state is serializable: enables deep linking, state persistence, and URL-based routing
- Screens are mounted/unmounted as users navigate  -  manage cleanup in useEffect return
- Type-safe navigation: define param types per screen to catch route errors at compile time
- Deep linking maps URLs to specific screens with parameters  -  critical for notifications and sharing

## Key Practices

- Define navigation types centrally: RootStackParamList with all screens and their params
- Use navigation.navigate for existing screens (no duplicate), push for new instances
- Configure deep linking with a linking config that maps URL patterns to screen names
- Use useFocusEffect for actions that should run when screen becomes visible (not just mounted)
- Reset navigation state for auth flows: after login, replace the stack to prevent back-to-login

## Common Mistakes

- Not typing navigation params: runtime crashes from missing or wrong-type parameters
- Memory leaks from listeners/subscriptions not cleaned up when screens unmount
- Deep nesting navigators without planning: makes deep linking and state management painful

## When to Apply

- Setting up app navigation structure (tabs, stacks, auth flow)
- Implementing deep linking from push notifications or external URLs
- Handling authentication flow transitions (login -> main app)
- Type-safe navigation in TypeScript React Native projects
