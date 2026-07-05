---
type: tool
title: "Java Version Migration"
---

# Java Version Migration

## Purpose

Plan and execute Java version migrations (e.g., 17 to 21) with feature adoption strategy. Covers virtual threads, records, pattern matching, sealed classes, and deprecation handling.

## When to Use

- Upgrading Java LTS version (11->17, 17->21, 21->25)
- Adopting new language features in existing codebase
- Evaluating virtual threads for concurrent workloads
- Handling deprecations and removed APIs
- Updating build tooling and dependencies for new JDK

## Prompt Template

```
CONTEXT:
- Current version: [Java 11 | 17 | 21]
- Target version: [Java 17 | 21 | 25]
- Build tool: [Maven | Gradle]
- Framework: [Spring Boot | Quarkus | Micronaut | Jakarta EE | plain]
- Codebase size: [approximate KLOC or module count]
- Key dependencies: [list major deps with current versions]
- Deployment: [container | app server | native image | serverless]

MIGRATION CHECKLIST:
1. Removed/deprecated APIs
   - javax.* -> jakarta.* namespace (if applicable)
   - Security Manager removal
   - Finalization deprecation
   - Reflection access restrictions (strong encapsulation)

2. New feature adoption (17->21)
   - Virtual threads: identify thread pool candidates
   - Record classes: replace data-carrier POJOs
   - Pattern matching: instanceof, switch expressions
   - Sealed classes: restrict type hierarchies
   - Sequenced collections: replace workarounds
   - String templates (preview)

3. Build tooling
   - Compiler source/target/release flags
   - --add-opens / --add-modules for reflection
   - Toolchain configuration (Gradle/Maven)
   - CI/CD pipeline JDK version

4. Dependency compatibility
   - Framework minimum version requirements
   - Bytecode level compatibility
   - Native image support (GraalVM version alignment)
   - Test framework updates (JUnit 5, Mockito)

5. Runtime behavior changes
   - GC defaults (G1 tuning, ZGC availability)
   - Class data sharing (CDS/AppCDS)
   - Container awareness improvements
   - Startup time optimizations

RISK ASSESSMENT:
- Binary compatibility breaks
- Reflection-heavy libraries (Hibernate, Jackson)
- Internal API usage (sun.misc.Unsafe)
- Performance regression paths
```

## Output Format

```
## Migration Plan: Java [current] -> [target]

### Breaking Changes
| Change | Impact | Files Affected | Fix |
|--------|--------|---------------|-----|
| ... | ... | ... | ... |

### Feature Adoption Priorities
| Feature | Benefit | Effort | Priority |
|---------|---------|--------|----------|
| ... | ... | ... | P1/P2/P3 |

### Dependency Updates
| Dependency | Current | Required | Notes |
|-----------|---------|----------|-------|
| ... | ... | ... | ... |

### Migration Phases
1. [Phase with scope and validation criteria]

### Testing Strategy
- [Compilation verification]
- [Unit test pass rate]
- [Integration test with new runtime]
- [Performance baseline comparison]

### Rollback Plan
- [How to revert if issues found in production]
```
