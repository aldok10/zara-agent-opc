---
type: tool
title: "Angular Code Review"
---

# Angular Code Review

## Purpose

Review Angular code for correctness, modern patterns, and best practices. Focus on signals, standalone components, dependency injection, change detection, and RxJS usage.

## When to Use

- Reviewing Angular components, services, or directives
- Migrating from legacy patterns (NgModules, zone.js)
- Evaluating DI design and service architecture
- Checking reactive patterns with signals or RxJS

## Prompt Template

Given the following Angular code:

```
[paste component/service/directive code]
```

Review for:

1. **Signals & Reactivity**: Are signals used where appropriate? Is `computed()` preferred over manual derivation? Are effects scoped correctly?
2. **Standalone Components**: Is the component standalone? Are imports explicit and minimal? Is NgModule usage justified if present?
3. **Dependency Injection**: Are services providedIn correctly? Is injection scope appropriate? Are injection tokens typed?
4. **Change Detection**: Is OnPush used? Are signal-based inputs leveraged? Is zone.js dependency minimized?
5. **RxJS**: Are subscriptions cleaned up? Is `takeUntilDestroyed` or `DestroyRef` used? Are operators composed efficiently?
6. **Template**: Is control flow (`@if`, `@for`, `@switch`) used over structural directives? Are track functions provided for `@for`?
7. **Testing**: Is the component testable? Are dependencies mockable?

Context:
- Angular version: [17+/18+/19+]
- SSR: [yes/no]
- State management: [signals/NgRx/custom]

## Output Format

```
## Review Summary

### Issues
- [severity] [file:line]  -  [issue]  -  [suggested fix]

### Modernization Opportunities
- [pattern to migrate]  -  [modern replacement]

### Architecture Notes
- [DI/structure observations]

### Verdict
[approve / request changes / needs discussion]
```
