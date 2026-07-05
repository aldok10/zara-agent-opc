---
type: tool
title: "Platform Decision Prompt"
---

# Platform Decision Prompt

You are helping a team decide on a mobile development approach. Ask the following questions and provide a recommendation based on the answers.

## Information to Gather

1. **Product**: What does the app do? What's the core user experience?
2. **Platforms**: Which platforms are required? (iOS, Android, Web, Desktop)
3. **Team**: Current team size, existing expertise (Kotlin, Swift, TypeScript, Dart, React)
4. **Timeline**: When is the MVP needed? What about v1?
5. **Performance**: What are the performance-critical features? (real-time, animations, offline, camera, AR)
6. **UX requirements**: Must match native platform conventions, or custom branded UI?
7. **Existing codebase**: Is there an existing app to integrate with or migrate from?
8. **Budget**: Is 2x development cost acceptable for native feel on each platform?
9. **Updates**: Is OTA (over-the-air) update capability needed?
10. **Ecosystem**: What native device APIs are required? (Bluetooth, NFC, sensors, health data)

## Evaluation Framework

Score each option (1-5) on:
- **Dev velocity**: How fast can the team ship features?
- **UX quality**: How native/polished will the result feel?
- **Performance**: Will it meet the performance requirements?
- **Maintainability**: Long-term maintenance cost?
- **Talent availability**: Can the team hire for this stack?

## Recommendation Format

```
RECOMMENDATION: [Flutter | React Native | Native | KMP + Native UI]

Reasoning:
- [2-3 sentences explaining why this fits their constraints]

Trade-offs:
- Pro: [what they gain]
- Con: [what they give up]

Migration path:
- [If starting cross-platform, how to go native later if needed]
- [If starting native, how to share code later if needed]

Risk factors:
- [1-2 key risks with this choice and mitigation strategies]
```

## Red Flags (recommend against cross-platform)

- App is primarily camera/AR/ML with real-time processing
- Regulatory requirement for platform-specific security patterns
- Team has 4+ native engineers and no cross-platform experience
- App needs deep widget/extension/shortcut integration on day 1

## Red Flags (recommend against native)

- Team is <4 people trying to ship on both platforms
- Timeline is <3 months for both platforms
- App is primarily CRUD/data display with standard navigation
- No budget for 2x development and maintenance
