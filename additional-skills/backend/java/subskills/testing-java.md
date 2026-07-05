# Subskill: Testing Java

> Activate when: writing JUnit 5 tests, configuring Testcontainers, using MockMvc, ArchUnit, WireMock, or designing test strategy for Spring Boot applications.

## Core Principles

1. **Test pyramid.** Unit tests (fast, many) → Integration tests (Testcontainers, fewer) → E2E tests (fewest).
2. **Real dependencies over mocks.** Testcontainers for databases, message brokers, Redis. Mock only external third-party APIs.
3. **Test slices over full context.** `@WebMvcTest`, `@DataJpaTest`, `@JsonTest`  -  load only what you need.
4. **ArchUnit for architecture.** Enforce module boundaries, layering rules, naming conventions as tests.
5. **Test behavior, not implementation.** Assert on outcomes, not internal method calls.

## Test Slices

| Annotation | Loads | Use For |
|-----------|-------|---------|
| `@WebMvcTest(Controller.class)` | MVC layer only | Controller logic, request mapping, validation |
| `@DataJpaTest` | JPA + embedded/test DB | Repository queries, entity mappings |
| `@JsonTest` | Jackson ObjectMapper | Serialization/deserialization |
| `@SpringBootTest` | Full context | Integration tests with Testcontainers |
| `@JdbcTest` | JDBC + DataSource | Raw SQL queries |

## Testcontainers Setup

```java
@SpringBootTest
@Testcontainers
class OrderRepositoryIntegrationTest {

    @Container
    @ServiceConnection  // Spring Boot 3.1+ auto-configures DataSource
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private OrderRepository orderRepository;

    @Test
    void shouldPersistAndRetrieveOrder() {
        var order = new Order(null, "ITEM-1", 3, Money.of(29.99));
        var saved = orderRepository.save(order);

        var found = orderRepository.findById(saved.id());
        assertThat(found).isPresent()
            .get()
            .satisfies(o -> {
                assertThat(o.itemCode()).isEqualTo("ITEM-1");
                assertThat(o.quantity()).isEqualTo(3);
            });
    }
}
```

## MockMvc Testing

```java
@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserService userService;

    @Test
    void shouldReturnUserById() throws Exception {
        when(userService.findById(1L)).thenReturn(Optional.of(new UserDto(1L, "Alice")));

        mockMvc.perform(get("/api/users/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Alice"));
    }

    @Test
    void shouldReturn404WhenUserNotFound() throws Exception {
        when(userService.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/users/99"))
            .andExpect(status().isNotFound());
    }

    @Test
    void shouldValidateRequestBody() throws Exception {
        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name": "", "email": "invalid"}
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors").isNotEmpty());
    }
}
```

## WireMock for External APIs

```java
@SpringBootTest
@WireMockTest(httpPort = 8089)
class PaymentGatewayClientTest {

    @Test
    void shouldHandleGatewayTimeout() {
        stubFor(post("/api/charge")
            .willReturn(aResponse()
                .withStatus(504)
                .withFixedDelay(5000)));

        assertThatThrownBy(() -> paymentClient.charge(amount))
            .isInstanceOf(PaymentTimeoutException.class);
    }
}
```

## ArchUnit  -  Architecture Tests

```java
@AnalyzeClasses(packages = "com.example.app")
class ArchitectureTest {

    @ArchTest
    static final ArchRule layeredArchitecture = layeredArchitecture()
        .consideringAllDependencies()
        .layer("Controller").definedBy("..controller..")
        .layer("Service").definedBy("..service..")
        .layer("Repository").definedBy("..repository..")
        .whereLayer("Controller").mayNotBeAccessedByAnyLayer()
        .whereLayer("Service").mayOnlyBeAccessedByLayers("Controller")
        .whereLayer("Repository").mayOnlyBeAccessedByLayers("Service");

    @ArchTest
    static final ArchRule noFieldInjection = noFields()
        .should().beAnnotatedWith(Autowired.class)
        .because("Use constructor injection");

    @ArchTest
    static final ArchRule servicesShouldNotDependOnControllers = noClasses()
        .that().resideInAPackage("..service..")
        .should().dependOnClassesThat().resideInAPackage("..controller..");
}
```

## Spring Modulith Testing

```java
@SpringBootTest
class ModularityTest {

    @Autowired
    private ApplicationModules modules;

    @Test
    void verifyModuleStructure() {
        modules.verify();  // Fails if module boundaries violated
    }

    @Test
    void documentModules() {
        new Documenter(modules).writeDocumentation();
    }
}
```

## Test Patterns

| Pattern | When | Example |
|---------|------|---------|
| Builder/ObjectMother | Complex test data | `TestOrder.builder().withItems(3).build()` |
| `@Nested` classes | Grouping related tests | State-based groups within a test class |
| `@ParameterizedTest` | Same logic, multiple inputs | Validation rules, edge cases |
| `assertAll()` | Multiple related assertions | Soft assertions  -  don't stop at first failure |
| `@DynamicTest` | Generated test cases | Data-driven testing |

## Anti-Patterns

| Wrong | Right | Why |
|-------|-------|-----|
| `@SpringBootTest` for unit tests | Plain JUnit or test slice | Slow, tests too much |
| Mocking the repository in integration tests | Testcontainers with real DB | Hides query bugs |
| Testing private methods | Test via public API | Couples tests to implementation |
| Shared mutable test state | `@BeforeEach` reset or fresh instances | Flaky tests |
| No assertions (just "no exception") | Assert specific outcomes | False confidence |

## Delegates To

- Spring Modulith boundaries → `knowledge/spring-modulith.md`
- Spring Boot test configuration → `subskills/spring-boot.md`
- Architecture decisions → SKILL.md constraints
