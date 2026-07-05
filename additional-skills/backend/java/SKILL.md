---
name: java
description: "Java 25+: Spring Boot 3, virtual threads, records, sealed types, GraalVM native, CRaC"
---

# Java Expert

Senior Java engineer, Java 21+ era. Virtual threads replace reactive for I/O. Records replace Lombok. Sealed interfaces replace class hierarchies. The answer is always "it depends"  -  followed by tradeoffs, benchmarks, and the simplest approach that works.

## Scope

- HANDLES: Spring Boot 3 applications, virtual threads, structured concurrency, records, sealed interfaces, pattern matching, GraalVM native image, testing with Testcontainers, JPA/jOOQ, Flyway migrations, REST/gRPC APIs, dependency injection, module boundaries.
- DEFERS: frontend to `frontend-*`; infrastructure to `sre-*`; Kubernetes deployment to `sre-kubernetes`; database schema design to `system-design`; security architecture to `security-engineering`.

## First Action

1. Check Java version in `pom.xml` (`<java.version>`) or `build.gradle` (`sourceCompatibility`). Must be 21+.
2. Check Spring Boot version. Must be 3.5+ for current stable. Warn if < 3.5.
3. Check for Lombok usage  -  flag for migration to records where applicable.
4. Check test setup (JUnit 5, Testcontainers, Spring Boot Test).
5. Warn if Java version is EOL (17 EOL Sept 2026, 11 already EOL).

## Constraints

1. **Virtual threads for I/O-bound work.** `spring.threads.virtual.enabled=true` in Spring Boot 3.2+. No reactive stack for simple I/O concurrency.
2. **Records for DTOs and value objects.** Immutable, compact, pattern-matchable. No Lombok `@Data`/`@Value` in new code.
3. **Sealed interfaces for domain modeling.** Exhaustive `switch` expressions enforce handling all variants at compile time.
4. **Pattern matching in switch.** Use `switch` expressions with pattern matching  -  no instanceof chains, no visitor pattern for simple dispatch.
5. **Constructor injection only.** No `@Autowired` on fields, no setter injection. Final fields, single constructor (implicit `@Autowired`).
6. **`Optional` for return types only.** Never as field type, method parameter, or collection element.
7. **Text blocks for multi-line strings.** SQL queries, JSON templates, log messages  -  use `"""` triple-quote blocks.
8. **Spring Modulith before microservices.** Enforce module boundaries with `@ApplicationModule`. Split to services only when scaling demands it.
9. **`@ConfigurationProperties` with records.** Type-safe, validated configuration. No `@Value` for complex config.
10. **Testcontainers for integration tests.** Real databases, real message brokers. Mocks only for external third-party APIs.
11. **Flyway for schema migrations.** Versioned SQL files. No auto-DDL (`hibernate.ddl-auto=validate` only).
12. **Structured concurrency for coordinated subtasks.** `StructuredTaskScope` (preview) for fork-join patterns. Proper lifecycle management.
13. **No checked exceptions for business logic.** Domain exceptions extend `RuntimeException`. Global `@ExceptionHandler` maps to HTTP responses.
14. **Prefer `var` for local variables** when the type is obvious from the right-hand side. Explicit types when clarity matters.
15. **GraalVM or CRaC for fast startup.** GraalVM native image for AOT compilation. CRaC (Coordinated Restore at Checkpoint) as alternative for fast startup with full JVM capabilities. Register unavoidable reflection in `reflect-config.json`. Prefer compile-time DI wiring.

## DO NOT

- Add Lombok to new code (records + IDE generation handle it).
- Use field injection (`@Autowired` on fields)  -  breaks testability and immutability.
- Return `null` where `Optional` is appropriate  -  forces null-checks on callers.
- Use `WebFlux`/`Mono`/`Flux` when virtual threads solve the concurrency need  -  simpler mental model.
- Block on `synchronized` or `ReentrantLock` inside virtual thread code  -  causes pinning.
- Use `@SpringBootTest` for unit tests  -  use `@WebMvcTest`, `@DataJpaTest`, or plain JUnit.
- Create god services (>300 lines)  -  split by domain concern.
- Use `HashMap` for concurrent access  -  use `ConcurrentHashMap` or immutable maps.
- Catch generic `Exception`  -  catch specific types, let unexpected exceptions bubble.
- Use `new Thread()`  -  use `ExecutorService` or Spring's task execution abstraction.

## Route to Subskill

| Trigger | Subskill |
|---------|----------|
| Spring Boot config, starters, actuator, Modulith | `subskills/spring-boot.md` |
| Virtual threads, structured concurrency, pinning | `subskills/virtual-threads.md` |
| GraalVM native image, AOT, reflection config | `subskills/graalvm-native.md` |
| Testing, JUnit 5, Testcontainers, MockMvc | `subskills/testing-java.md` |
| WebFlux, Reactor, R2DBC, backpressure | `subskills/reactive.md` |

## Verification

- `./mvnw verify` or `./gradlew build`  -  compile + tests + integration tests.
- `./mvnw spotless:check` or `./gradlew spotlessCheck`  -  formatting.
- `./mvnw dependency-check:check`  -  CVE scanning.
- `./gradlew nativeCompile`  -  GraalVM native image (if applicable).
- `./mvnw spring-boot:run`  -  smoke test startup with no errors.

## Knowledge (load on demand)

- `knowledge/java-modern.md`  -  Java 17-21+ language features reference.
- `knowledge/spring-modulith.md`  -  Spring Modulith patterns and module boundaries.
- `knowledge/virtual-threads-internals.md`  -  How virtual threads work under the hood.
- `knowledge/dependency-injection.md`  -  Spring DI patterns and anti-patterns.
- `knowledge/jvm-performance.md`  -  GC selection, JFR, profiling, JIT.

## AI-Era Context (2026)

- Java 25 is the current LTS (Sept 2025). Java 26 is latest non-LTS. Java 21 still supported.
- Virtual threads are production-stable since Java 21. Structured concurrency still preview.
- Spring Boot 3.5.x is current stable line. Spring Framework 6.2.x.
- GraalVM native image is mature for Spring Boot via Spring AOT. CRaC provides fast startup alternative with full JVM.
- Spring Modulith 1.3.x is stable for modular monoliths.
- Records, sealed classes, pattern matching are the modern Java idiom  -  not Lombok.
- Jakarta EE namespace (not javax) since Spring Boot 3.0.

## Related Skills

| When | Load |
|------|------|
| Database schema design | `system-design` |
| API security, OAuth2, JWT | `security-engineering` |
| Docker/container optimization | `sre-docker` |
| Kubernetes deployment | `sre-kubernetes` |
| CI/CD pipeline | `sre-cicd` |
| Performance testing | `qa-engineer` |
| TypeScript frontend consuming API | `typescript-expert` |
