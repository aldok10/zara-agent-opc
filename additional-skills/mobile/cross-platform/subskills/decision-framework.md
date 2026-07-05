# Cross-Platform Decision Framework

Criteria for choosing between Flutter, React Native, native, and KMP for mobile development.

## When to Load

- Starting a new mobile project and evaluating technology options
- Migrating from one approach to another
- Building a business case for native vs cross-platform
- Assessing team capabilities against project requirements

## Key Concepts

**Decision Matrix**

| Factor | Native | Flutter | React Native | KMP |
|--------|--------|---------|--------------|-----|
| Performance | Best | Near-native | Good | Native |
| UI Fidelity | Perfect | Custom (Material/Cupertino) | Native components | Native |
| Code Sharing | 0% | 90%+ | 80%+ | 50-80% (logic) |
| Team | iOS + Android devs | Dart devs | JS/TS devs | Kotlin devs |
| Time to Market | Slowest | Fast | Fast | Medium |
| Platform APIs | Direct | Plugin system | Bridge/JSI | expect/actual |
| Hot Reload | No | Yes | Yes | No |
| App Size | Smallest | +5-10MB | +5-15MB | Minimal |

**Choose Native When**
- Performance is the primary requirement (games, video, AR)
- Deep platform integration needed (HealthKit, CarPlay, Widgets)
- Team already has experienced native developers
- App is platform-specific (iOS only, or Android only)
- Long-term maintainability is prioritized over speed

**Choose Flutter When**
- Pixel-perfect custom UI across platforms (same look everywhere)
- Rapid prototyping and iteration needed
- Team comfortable with Dart or willing to learn
- Targeting beyond mobile: web, desktop, embedded
- Consistent UI is more important than platform-native feel

**Choose React Native When**
- Team has strong JavaScript/TypeScript skills
- Sharing code with existing web application
- Using many native modules is acceptable (Expo ecosystem)
- Brownfield: adding cross-platform features to existing native apps
- Large JS ecosystem access is valuable

**Choose KMP When**
- Sharing business logic but keeping native UI
- Team has Kotlin expertise
- Gradual migration from existing native apps
- Platform-specific UI is non-negotiable
- Targeting iOS + Android + backend (shared domain layer)

## Patterns

**Evaluation Scorecard**
```
Project: [Name]
Timeline: [X months]
Team: [Y developers, skills: ...]

Scoring (1-5 per criterion, weight each):
- Performance requirements: [score] x [weight]
- UI complexity/customization: [score] x [weight]
- Platform API depth: [score] x [weight]
- Team expertise match: [score] x [weight]
- Time-to-market pressure: [score] x [weight]
- Long-term maintenance budget: [score] x [weight]
- Code sharing priority: [score] x [weight]

Result: [weighted total per option]
Recommendation: [option with highest weighted score]
```

**Hybrid Approaches**
- KMP for shared logic + SwiftUI/Compose for UI
- React Native shell + native modules for performance-critical screens
- Flutter for most screens + platform channel for specific native features
- Native app with shared C/Rust library for core algorithms

**Migration Path Considerations**
- Native -> Cross-platform: start with new features, gradually migrate
- Cross-platform -> Native: usually driven by performance or UX ceiling
- Strangler pattern: wrap existing screens, replace one at a time
- Shared module: extract common logic into KMP module used by both native apps

## Gotchas

- "Write once, run anywhere" is a myth -- platform-specific code is always needed
- Flutter's custom rendering means accessibility tooling differs from native
- React Native's bridge can be a bottleneck for heavy native-JS communication
- KMP is young on iOS side -- tooling and community are smaller
- Hiring: cross-platform devs who understand both platforms deeply are rare
- App Store/Play Store guidelines may require platform-specific behaviors

## Verification

- Build proof-of-concept with top 2 options before committing
- Test performance-critical paths on target devices (not just emulator)
- Evaluate third-party library availability for required features
- Confirm team can ship first feature within expected timeline
- Check: are there platform-specific requirements that eliminate options?
