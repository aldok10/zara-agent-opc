---
type: subskill
title: "Subskill: GraalVM Native Image"
---

# Subskill: GraalVM Native Image

> Activate when: building native executables, configuring AOT metadata, debugging native image compilation issues, or optimizing startup/memory for cloud deployment.

## Core Principles

1. **Closed-world assumption.** All code reachable at runtime must be known at build time. No dynamic class loading.
2. **Reflection requires registration.** Any reflective access must be declared in metadata files or via `@RegisterReflectionForBinding`.
3. **Build-time initialization preferred.** Classes initialized at build time reduce startup. Runtime-init only when state depends on environment.
4. **Spring AOT does the heavy lifting.** Spring Boot 3 generates AOT metadata automatically for most Spring patterns.
5. **Test native before deploying.** `./mvnw -Pnative native:compile` or `./gradlew nativeCompile`. Run native tests with `nativeTest`.

## Spring Boot Native Support

```xml
<!-- pom.xml  -  Spring Boot 3 native profile -->
<profiles>
    <profile>
        <id>native</id>
        <build>
            <plugins>
                <plugin>
                    <groupId>org.graalvm.buildtools</groupId>
                    <artifactId>native-maven-plugin</artifactId>
                </plugin>
            </plugins>
        </build>
    </profile>
</profiles>
```

```bash
# Build native image
./mvnw -Pnative native:compile

# Run native tests
./mvnw -Pnative native:test

# Gradle equivalent
./gradlew nativeCompile
./gradlew nativeTest
```

## Reachability Metadata

When Spring AOT can't infer reflective access:

```java
// Option 1: Annotation-based hints
@RegisterReflectionForBinding(ExternalApiResponse.class)
@Configuration
public class NativeConfig {}

// Option 2: RuntimeHintsRegistrar
@ImportRuntimeHints(MyHints.class)
@Configuration
public class NativeConfig {}

public class MyHints implements RuntimeHintsRegistrar {
    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
        hints.reflection()
            .registerType(ExternalDto.class, MemberCategory.INVOKE_DECLARED_CONSTRUCTORS,
                MemberCategory.INVOKE_DECLARED_METHODS);
        hints.resources()
            .registerPattern("templates/*.json");
    }
}
```

## Manual Metadata Files

Place in `src/main/resources/META-INF/native-image/{groupId}/{artifactId}/`:

```json
// reflect-config.json
[
  {
    "name": "com.example.dto.PaymentResponse",
    "allDeclaredConstructors": true,
    "allDeclaredMethods": true,
    "allDeclaredFields": true
  }
]
```

```json
// resource-config.json
{
  "resources": {
    "includes": [
      {"pattern": "templates/.*\\.json"},
      {"pattern": "META-INF/services/.*"}
    ]
  }
}
```

## Build-Time vs Runtime Initialization

```json
// native-image.properties
Args = --initialize-at-build-time=com.example.config.StaticConfig \
       --initialize-at-run-time=com.example.crypto.SecureRandom
```

**Build-time init:** Constants, static config, immutable lookup tables.
**Runtime init:** Anything using random, time, environment variables, file I/O.

## Common Issues and Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| `ClassNotFoundException` at runtime | Class not reachable at build time | Add to `reflect-config.json` |
| Jackson deserialization fails | Record/DTO not registered | `@RegisterReflectionForBinding` |
| Resource not found | Resource not included | Add to `resource-config.json` |
| Proxy creation fails | Dynamic proxy not registered | `proxy-config.json` or `RuntimeHints` |
| Slow native build | Large classpath | Exclude unused starters, use `-Ob` for dev builds |

## GraalVM Build Optimization

```xml
<!-- pom.xml native profile -->
<configuration>
    <buildArgs>
        <arg>-Ob</arg>           <!-- Quick build (dev only, no optimization) -->
        <arg>--gc=serial</arg>   <!-- Smaller image for low-memory containers -->
        <arg>--static</arg>      <!-- Fully static binary (musl libc) -->
        <arg>-march=native</arg> <!-- Optimize for build machine CPU -->
    </buildArgs>
</configuration>
```

Production build (no `-Ob`):
- Startup: 50-100ms (vs 2-5s JVM)
- Memory: 50-100MB RSS (vs 200-500MB JVM)
- Image size: 50-100MB

## Testing Native Compatibility

```java
// Test that AOT metadata is complete
@SpringBootTest
@ImportRuntimeHints(MyHints.class)
class NativeCompatibilityTest {

    @Autowired
    private ApplicationContext context;

    @Test
    void contextLoads() {
        // If this passes in nativeTest, all beans can be instantiated
        assertThat(context).isNotNull();
    }
}
```

## Tracing Agent (discover metadata)

```bash
# Run app with tracing agent to discover reflection/resource usage
java -agentlib:native-image-agent=config-output-dir=src/main/resources/META-INF/native-image \
     -jar target/app.jar

# Exercise all code paths, then stop. Agent writes config files.
```

## When NOT to Use Native

| Scenario | Why | Alternative |
|----------|-----|-------------|
| Heavy reflection (ORM magic, bytecode manipulation) | Metadata burden too high | JVM with CDS/AppCDS |
| Rapid iteration during development | Build takes 2-5 minutes | JVM + DevTools |
| Peak throughput matters more than startup | JIT outperforms AOT long-term | JVM with C2 |
| Dynamic plugins/class loading | Incompatible with closed world | JVM |

## Delegates To

- Spring Boot configuration → `subskills/spring-boot.md`
- JVM performance (when native isn't right) → `knowledge/jvm-performance.md`
- Testing native builds → `subskills/testing-java.md`
