---
name: react-native
description: "React Native: New Architecture, Expo 52+, React Navigation 7, Reanimated 3, Hermes"
---

# React Native

Production React Native with New Architecture, Expo, and modern tooling.

## Scope

- React Native 0.77+ with New Architecture enabled (Fabric + TurboModules)
- Expo 52+ as the default framework layer
- React Navigation 7 with static type-safe config
- Reanimated 3 for 60fps animations on UI thread
- Hermes engine (default, AOT-compiled)
- TypeScript strict mode for all code
- EAS Build + EAS Update for CI/CD

## First Action

Read `package.json`, `app.json`/`app.config.ts`, one screen component, and the navigation config to understand project conventions before writing code.

## Constraints

1. New Architecture is default and only supported path - bridgeless mode is the baseline
2. Expo SDK 52+ -- use Expo modules over bare RN when available
3. Fabric renderer for all custom native views
4. React Navigation 7 with TypeScript-first static API
5. Reanimated 3 worklets for animations -- no `Animated` API from RN core
6. Hermes is default -- no V8 or JSC unless debugging specific issue
7. TypeScript strict: `strict: true`, no `any` without justification
8. State: Zustand or Jotai for global state, React Query/TanStack for server state
9. Styling: Nativewind (Tailwind) or StyleSheet -- consistent per project
10. No `bridge` calls in new code -- JSI/TurboModules only
11. EAS Build for native builds -- no local `react-native run-*` in CI
12. Expo Router (file-based) OR React Navigation -- one per project, not both
13. Minimum React 19 with concurrent features

## DO NOT

- Use the old bridge architecture for new native modules
- Mix Expo Router and React Navigation in the same project
- Use `Animated` from `react-native` -- use Reanimated 3
- Write JS instead of TypeScript
- Use Class Components -- functional only with hooks
- Install pods manually -- use `expo prebuild` or EAS
- Use `AsyncStorage` directly -- use MMKV for performance
- Skip error boundaries on navigation screens
- Use `expo eject` -- it's deprecated, use CNG (Continuous Native Generation)

## Route to Subskill

| Signal | Route to |
|--------|----------|
| Native module in Kotlin/Swift | android-kotlin / ios-swift |
| Platform selection decision | cross-platform |
| TypeScript patterns | typescript-expert |
| CI/CD pipeline | engineering-workflow |
| API design | system-design |
| Test setup | testing-strategy |

## Verification

- [ ] `npx tsc --noEmit` passes
- [ ] `npx eslint .` zero errors
- [ ] `npx jest` all green
- [ ] EAS build succeeds for both platforms
- [ ] New Architecture enabled in `app.json` (`"newArchEnabled": true`)
- [ ] No bridge-based native module imports

## Knowledge

- `package.json` (deps + scripts)
- `app.json` or `app.config.ts` (Expo config)
- `tsconfig.json`
- `src/navigation/` or `app/` (routes)
- `src/screens/` or `app/(tabs)/` (screens)
- `metro.config.js`

## AI-Era Context (2026)

- New Architecture is the only supported path -- bridgeless mode default
- Expo 52 CNG eliminates manual native config -- `expo prebuild` generates native projects
- React 19 Server Components exploration in RN (experimental)
- Static Hermes (ahead-of-time compilation) dramatically improves startup
- Reanimated 4 preview with CSS-like keyframe API
- Expo Modules API replaces legacy native module patterns entirely
- RSC + Server Actions for data fetching in framework layer (early adoption)

## Related Skills

- `typescript-expert` -- strict TypeScript patterns
- `cross-platform` -- when RN is/isn't the right choice
- `testing-strategy` -- component testing, E2E with Detox/Maestro
- `engineering-workflow` -- EAS Build/Update CI pipeline
