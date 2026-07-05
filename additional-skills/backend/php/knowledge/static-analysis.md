# Static Analysis: PHPStan, Psalm, Rector

## PHPStan

### Levels

| Level | What It Checks |
|-------|---------------|
| 0 | Basic: undefined variables, unknown classes |
| 1 | Return types, possibly undefined variables |
| 2 | Unknown methods on `mixed` |
| 3 | Return types verified |
| 4 | Dead code, unreachable |
| 5 | Argument types |
| 6 | Missing typehints reported |
| 7 | Partial union types |
| 8 | No mixed allowed |
| 9 | Mixed operations, strict comparisons, full type safety |

### Configuration (`phpstan.neon`)

```neon
parameters:
    level: 9
    paths:
        - src
        - tests
    excludePaths:
        - src/Legacy/*
    tmpDir: var/cache/phpstan
    checkMissingIterableValueType: true
    checkGenericClassInNonGenericObjectType: true
    reportUnmatchedIgnoredErrors: true

includes:
    - vendor/phpstan/phpstan-strict-rules/rules.neon
    - vendor/phpstan/phpstan-deprecation-rules/rules.neon
```

### Essential Extensions

- `phpstan-strict-rules`: Disallows loose comparisons, empty(), etc.
- `phpstan-deprecation-rules`: Reports deprecated usage.
- `larastan` (Laravel): Eloquent model types, container resolution.
- `phpstan-symfony` (Symfony): Container types, Twig.
- `phpstan-doctrine`: Entity relationships, DQL types.

### Baseline (Legacy Migration)

```bash
vendor/bin/phpstan analyse --generate-baseline
# Creates phpstan-baseline.neon — existing errors ignored, new ones blocked
```

### Custom Rules

```php
final class NoDirectEntityManagerRule implements Rule
{
    public function getNodeType(): string { return MethodCall::class; }

    public function processNode(Node $node, Scope $scope): array
    {
        // Flag direct EntityManager usage in controllers
    }
}
```

## Psalm

### When Psalm Over PHPStan

- Need taint analysis (security: tracking user input to dangerous sinks).
- Need template/generic types in complex scenarios.
- Psalm's type inference is sometimes more precise for complex generics.

### Taint Analysis

```php
/** @psalm-taint-source input */
$userInput = $_GET['name'];

// Psalm detects tainted data flowing to dangerous sinks
echo $userInput; // TaintedHtml error
$db->query("SELECT * FROM users WHERE name = '$userInput'"); // TaintedSql error
```

### Configuration (`psalm.xml`)

```xml
<psalm errorLevel="1" findUnusedCode="true">
    <projectFiles>
        <directory name="src" />
    </projectFiles>
    <plugins>
        <pluginClass class="Psalm\LaravelPlugin\Plugin" />
    </plugins>
</psalm>
```

## Rector (Automated Refactoring)

### Purpose

- Automated code upgrades (PHP version migrations).
- Enforce coding standards programmatically.
- Remove dead code, modernize syntax.

### Configuration (`rector.php`)

```php
use Rector\Config\RectorConfig;
use Rector\Set\ValueObject\LevelSetList;
use Rector\Set\ValueObject\SetList;

return RectorConfig::configure()
    ->withPaths([__DIR__ . '/src', __DIR__ . '/tests'])
    ->withSets([
        LevelSetList::UP_TO_PHP_84,
        SetList::DEAD_CODE,
        SetList::TYPE_DECLARATION,
        SetList::EARLY_RETURN,
    ])
    ->withSkip([__DIR__ . '/src/Legacy']);
```

### Common Sets

- `UP_TO_PHP_84`: Migrates syntax to PHP 8.4 patterns.
- `DEAD_CODE`: Removes unused methods, variables, conditions.
- `TYPE_DECLARATION`: Adds return types from usage inference.
- `CODE_QUALITY`: match over switch, early returns, string functions.

### Usage

```bash
vendor/bin/rector process --dry-run  # Preview changes
vendor/bin/rector process            # Apply changes
```

## CI Integration

```yaml
# GitHub Actions
jobs:
  static-analysis:
    steps:
      - run: vendor/bin/phpstan analyse --no-progress
      - run: vendor/bin/rector process --dry-run  # Ensure no unprocessed rules
```

## Rules

1. New projects: start at PHPStan level 9 — never lower.
2. Legacy projects: baseline + level 6 minimum, increment monthly.
3. CI blocks on any new PHPStan error — zero tolerance for regression.
4. Rector dry-run in CI — ensures automated fixes are applied.
5. Custom rules for domain invariants (no framework in domain layer).
