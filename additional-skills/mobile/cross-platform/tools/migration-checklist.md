# Native to Cross-Platform Migration Checklist

## Pre-Migration Assessment

### Codebase Analysis
- [ ] Inventory all screens/features in native app (both platforms)
- [ ] Identify platform-specific features (widgets, extensions, shortcuts, Siri/Google Assistant)
- [ ] Catalog native SDKs/libraries in use (map to cross-platform equivalents)
- [ ] Measure current app performance baselines (startup, scroll fps, memory)
- [ ] Document custom native UI components (need recreation effort)
- [ ] List all native APIs accessed (camera, Bluetooth, NFC, HealthKit, etc.)

### Feasibility Check
- [ ] Verify all required native APIs have cross-platform equivalents or plugins
- [ ] Prototype highest-risk feature in target framework (2-3 day spike)
- [ ] Confirm CI/CD tooling supports target framework
- [ ] Validate third-party SDK availability (analytics, crash reporting, payments)
- [ ] Check regulatory/compliance constraints allow cross-platform approach

### Team Readiness
- [ ] Assess team's familiarity with target framework (training needed?)
- [ ] Plan knowledge transfer period (2-4 weeks ramp-up typical)
- [ ] Identify native expertise still needed (at least 1 person per platform for edge cases)
- [ ] Establish code review standards for new framework

## Migration Strategy

### Approach A: Strangler Fig (Incremental)

Best for: large apps, teams that can't stop feature work.

1. [ ] Integrate cross-platform framework into existing native app (brownfield)
2. [ ] Migrate one feature/screen at a time (start with least complex)
3. [ ] Maintain native shell with cross-platform screens embedded
4. [ ] Gradually increase cross-platform surface area
5. [ ] Remove native screens as replacements are validated
6. [ ] Final cutover: cross-platform becomes the shell

Pros: Low risk, continuous delivery, team learns gradually.
Cons: Slower, maintaining two systems during transition.

### Approach B: Clean Rewrite (Greenfield)

Best for: small apps (<20 screens), major redesign planned anyway.

1. [ ] Build new app from scratch in target framework
2. [ ] Port features in priority order (core flow first)
3. [ ] Run both apps in parallel during transition
4. [ ] A/B test new app with subset of users
5. [ ] Full cutover when feature parity + quality bar met

Pros: Clean architecture, no legacy constraints.
Cons: High risk, feature parity gap, dual maintenance during transition.

### Approach C: Shared Logic First (KMP Path)

Best for: complex business logic, keeping native UI.

1. [ ] Extract business logic into KMP shared module
2. [ ] Native UI stays native (no user-facing change)
3. [ ] Gradually move data layer, networking, caching to shared
4. [ ] Optionally migrate UI later (Compose Multiplatform) or keep native

Pros: No UX risk, incremental, validates sharing before committing.
Cons: Requires Kotlin expertise, iOS integration overhead.

## Execution Checklist

### Phase 1: Foundation (Weeks 1-4)
- [ ] Set up project structure and build pipeline
- [ ] Configure CI/CD for new framework
- [ ] Implement design system / component library
- [ ] Set up navigation structure
- [ ] Implement authentication flow
- [ ] Configure analytics and crash reporting
- [ ] Set up testing infrastructure (unit, widget/component, integration)

### Phase 2: Core Features (Weeks 4-12)
- [ ] Migrate core user journey (the "happy path")
- [ ] Implement data layer (API clients, caching, offline)
- [ ] Port push notification handling
- [ ] Implement deep linking
- [ ] Add error handling and retry logic
- [ ] Performance optimization pass

### Phase 3: Parity (Weeks 12-20)
- [ ] Migrate remaining features
- [ ] Implement platform-specific features (widgets, extensions)
- [ ] Accessibility audit and fixes
- [ ] Localization migration
- [ ] Edge case handling (offline, poor network, background)
- [ ] Performance comparison with native baseline

### Phase 4: Validation (Weeks 20-24)
- [ ] Internal beta testing (full regression)
- [ ] Performance benchmarking against baselines
- [ ] Accessibility testing with screen readers
- [ ] External beta (10-20% users)
- [ ] Monitor crash rates, ANRs, performance metrics
- [ ] Address feedback from beta period

### Phase 5: Cutover
- [ ] Full rollout with kill switch
- [ ] Monitor metrics for 2 weeks post-launch
- [ ] Decommission native codebase (or archive)
- [ ] Update documentation and onboarding

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Performance regression | Benchmark before/after, keep native fallback |
| Missing native API | Check plugin availability before committing, budget for native module work |
| Team ramp-up slower than expected | Pair programming, external consultants for first 4 weeks |
| Third-party SDK not available | Contact vendor early, build wrapper if needed |
| App Store rejection | Test submission early with minimal version |
| User complaints on UX change | A/B test, gradual rollout, feedback channels |

## Success Metrics

- [ ] Startup time within 20% of native baseline
- [ ] Scroll performance: 58+ fps consistently
- [ ] Crash rate: equal or better than native version
- [ ] Feature parity: 100% of critical paths migrated
- [ ] Test coverage: >80% for shared logic, >60% for UI
- [ ] Team velocity: shipping features at equal or better rate within 3 months
