---
type: fact
title: "Java 17-25 modern language features reference"
---

# Java Modern Features (17-25)

## Records (Java 16+)

Immutable data carriers. Replace Lombok `@Data`/`@Value` for DTOs.

```java
// Compact, immutable, auto-generates equals/hashCode/toString
public record UserDto(Long id, String name, String email) {}

// Compact constructor for validation
public record Money(BigDecimal amount, Currency currency) {
    public Money {
        if (amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Amount must be non-negative");
        }
    }
}

// Records with custom methods
public record Range(int start, int end) {
    public int length() { return end - start; }
    public boolean contains(int value) { return value >= start && value <= end; }
}
```

## Sealed Interfaces (Java 17+)

Restrict which classes can implement an interface. Enables exhaustive pattern matching.

```java
public sealed interface PaymentResult
    permits PaymentSuccess, PaymentDeclined, PaymentError {
}

public record PaymentSuccess(String transactionId, Instant timestamp) implements PaymentResult {}
public record PaymentDeclined(String reason, String code) implements PaymentResult {}
public record PaymentError(Exception cause) implements PaymentResult {}
```

## Pattern Matching for switch (Java 21+)

```java
// Exhaustive  -  compiler enforces all cases handled
String describe(PaymentResult result) {
    return switch (result) {
        case PaymentSuccess s -> "Paid: " + s.transactionId();
        case PaymentDeclined d -> "Declined: " + d.reason();
        case PaymentError e -> "Error: " + e.cause().getMessage();
    };
}

// Guarded patterns
String classify(Shape shape) {
    return switch (shape) {
        case Circle c when c.radius() > 100 -> "large circle";
        case Circle c -> "small circle";
        case Rectangle r when r.width() == r.height() -> "square";
        case Rectangle r -> "rectangle";
    };
}
```

## Pattern Matching for instanceof (Java 16+)

```java
// No explicit cast needed
if (obj instanceof String s && s.length() > 5) {
    System.out.println(s.toUpperCase());
}
```

## Text Blocks (Java 15+)

```java
String sql = """
    SELECT u.id, u.name, u.email
    FROM users u
    WHERE u.status = :status
    ORDER BY u.created_at DESC
    LIMIT :limit
    """;

String json = """
    {
        "name": "%s",
        "age": %d
    }
    """.formatted(name, age);
```

## Switch Expressions (Java 14+)

```java
int daysInMonth = switch (month) {
    case JANUARY, MARCH, MAY, JULY, AUGUST, OCTOBER, DECEMBER -> 31;
    case APRIL, JUNE, SEPTEMBER, NOVEMBER -> 30;
    case FEBRUARY -> isLeapYear ? 29 : 28;
};
```

## Local Variable Type Inference (var) (Java 10+)

```java
var users = userRepository.findAll();         // List<User>
var entry = Map.entry("key", "value");        // Map.Entry<String, String>
var stream = items.stream().filter(i -> i.isActive());  // Stream<Item>

// DON'T: var result = process();  -  unclear what type `result` is
```

## Helpful NullPointerExceptions (Java 14+)

```
// JVM tells you exactly what was null
java.lang.NullPointerException: Cannot invoke "String.length()"
    because the return value of "User.getName()" is null
```

## SequencedCollections (Java 21+)

```java
SequencedCollection<String> list = new ArrayList<>(List.of("a", "b", "c"));
list.getFirst();   // "a"
list.getLast();    // "c"
list.reversed();   // ["c", "b", "a"]  -  reversed view
```

## String Enhancements

```java
// Java 12+
"  hello  ".strip();           // "hello"
"hello".indent(4);             // "    hello\n"
"hello".transform(s -> s.toUpperCase());  // "HELLO"

// Java 15+: formatted
"Hello, %s!".formatted("world");  // "Hello, world!"
```

## Stream Enhancements

```java
// Java 16+: toList() (unmodifiable)
var names = users.stream().map(User::name).toList();

// Java 16+: mapMulti
Stream<Integer> flattened = nested.stream()
    .<Integer>mapMulti((list, consumer) -> list.forEach(consumer));

// Java 9+: takeWhile/dropWhile
Stream.of(1, 2, 3, 4, 5).takeWhile(n -> n < 4);  // 1, 2, 3
```

## Virtual Threads (Java 21+)

See `subskills/virtual-threads.md` for full coverage.

```java
// One-liner
Thread.startVirtualThread(() -> doWork());

// Executor
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    executor.submit(() -> fetchData());
}
```

## Structured Concurrency (Java 25, finalized)

```java
// Scoped, structured task management  -  replaces ad-hoc executor patterns
try (var scope = StructuredTaskScope.open()) {
    Subtask<User> user = scope.fork(() -> fetchUser(id));
    Subtask<Order> order = scope.fork(() -> fetchOrder(id));
    scope.join();
    return new UserOrder(user.get(), order.get());
}
// All subtasks cancelled automatically if scope fails
```

## Scoped Values (Java 25, finalized)

```java
// Replaces ThreadLocal for virtual threads  -  immutable, inheritable, bounded scope
static final ScopedValue<RequestContext> CTX = ScopedValue.newInstance();

ScopedValue.runWhere(CTX, context, () -> {
    handleRequest();  // CTX available throughout this scope
});
```

## Unnamed Patterns and Variables (Java 22+)

```java
// Unnamed variable  -  explicitly unused
try { /* ... */ } catch (Exception _) { log.warn("failed"); }

// In pattern matching
if (obj instanceof Point(var x, _)) {
    // Only care about x coordinate
}

// In enhanced for
for (var _ : collection) { count++; }
```

## Statements Before super() (Java 22+)

```java
// Validation before calling super constructor
public class PositiveAmount extends Amount {
    public PositiveAmount(BigDecimal value) {
        if (value.signum() <= 0) throw new IllegalArgumentException("Must be positive");
        super(value);  // statements before super() now allowed
    }
}
```

## Stream Gatherers (Java 24+)

```java
// Custom intermediate stream operations
var windowedAvg = readings.stream()
    .gather(Gatherers.windowSliding(5))
    .map(window -> window.stream().mapToDouble(v -> v).average().orElse(0))
    .toList();
```
