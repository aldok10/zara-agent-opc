---
type: fact
title: "PIT and Stryker Setup"
---

# PIT and Stryker Setup

## Stryker Mutator (JavaScript/TypeScript)

### Installation
```bash
npm install --save-dev @stryker-mutator/core
npx stryker init
```

### Configuration (stryker.config.mjs)
```javascript
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  mutate: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.d.ts'
  ],
  testRunner: 'jest',         // or 'vitest', 'mocha', 'karma'
  reporters: ['html', 'progress', 'clear-text'],
  coverageAnalysis: 'perTest', // Only run relevant tests per mutant
  thresholds: {
    high: 90,
    low: 70,
    break: 60  // CI fails below this
  },
  concurrency: 4,             // Parallel mutant testing
  timeoutMS: 10000,
  tempDirName: '.stryker-tmp',
  
  // Ignore specific patterns
  ignorers: ['string-literal'],
  
  // Disable specific mutators
  mutator: {
    excludedMutations: [
      'StringLiteral',        // Often noise
      'ObjectLiteral'         // Config objects
    ]
  }
};
```

### Running
```bash
# Full run
npx stryker run

# Target specific files
npx stryker run --mutate 'src/services/order.ts'

# With specific test filter
npx stryker run --testFilter 'order'
```

### Stryker Mutators (JavaScript)
| Mutator | Example |
|---------|---------|
| ArithmeticOperator | `a + b` → `a - b` |
| ArrayDeclaration | `[a, b]` → `[]` |
| BlockStatement | `{ stmts }` → `{}` |
| BooleanLiteral | `true` → `false` |
| ConditionalExpression | `a > b` → `true` / `false` |
| EqualityOperator | `===` → `!==` |
| LogicalOperator | `&&` → `||` |
| MethodExpression | `.filter()` → `.slice()` |
| OptionalChaining | `a?.b` → `a.b` |
| StringLiteral | `"foo"` → `""` |
| UnaryOperator | `-a` → `+a` |
| UpdateOperator | `a++` → `a--` |

### Disable for Specific Lines
```typescript
// Stryker disable next-line all: equivalent mutant
const MAX_RETRIES = 3;

// Stryker disable next-line BooleanLiteral,ConditionalExpression
if (config.isProduction) {
  enableMonitoring();
}
```

## PIT (Java/Kotlin)

### Maven Setup
```xml
<plugin>
  <groupId>org.pitest</groupId>
  <artifactId>pitest-maven</artifactId>
  <version>1.15.3</version>
  <dependencies>
    <dependency>
      <groupId>org.pitest</groupId>
      <artifactId>pitest-junit5-plugin</artifactId>
      <version>1.2.1</version>
    </dependency>
  </dependencies>
  <configuration>
    <targetClasses>
      <param>com.example.service.*</param>
    </targetClasses>
    <targetTests>
      <param>com.example.service.*Test</param>
    </targetTests>
    <mutators>
      <mutator>STRONGER</mutator>
    </mutators>
    <outputFormats>
      <outputFormat>HTML</outputFormat>
      <outputFormat>XML</outputFormat>
    </outputFormats>
    <mutationThreshold>80</mutationThreshold>
    <timestampedReports>false</timestampedReports>
    <threads>4</threads>
  </configuration>
</plugin>
```

### Running PIT
```bash
# Full mutation run
mvn org.pitest:pitest-maven:mutationCoverage

# Incremental (only changed code since last run)
mvn org.pitest:pitest-maven:mutationCoverage -DwithHistory

# Target specific class
mvn org.pitest:pitest-maven:mutationCoverage -DtargetClasses="com.example.OrderService"
```

### PIT Mutator Groups
| Group | Mutators Included |
|-------|------------------|
| OLD_DEFAULTS | Conditionals, Math, Increments, Invert Negatives, Return Vals |
| DEFAULTS | OLD_DEFAULTS + Void Method Calls |
| STRONGER | DEFAULTS + Remove Conditionals, Replace Returns |
| ALL | Every available mutator |

### Gradle Setup
```kotlin
plugins {
    id("info.solidsoft.pitest") version "1.15.0"
}

pitest {
    targetClasses.set(listOf("com.example.service.*"))
    targetTests.set(listOf("com.example.service.*Test"))
    mutators.set(listOf("STRONGER"))
    threads.set(4)
    outputFormats.set(listOf("HTML", "XML"))
    mutationThreshold.set(80)
    timestampedReports.set(false)
}
```

## CI Integration

### Stryker in GitHub Actions
```yaml
jobs:
  mutation-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx stryker run
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: mutation-report
          path: reports/mutation/
```

### Incremental Mutation Testing
Only mutate changed files (critical for CI speed):

```bash
# Stryker: mutate only changed files
CHANGED=$(git diff --name-only origin/main -- 'src/**/*.ts' | grep -v spec)
npx stryker run --mutate "$CHANGED"
```

## Performance Tips

1. **Use coverageAnalysis: perTest**  -  only run tests affected by each mutant
2. **Limit scope**  -  mutate only the PR's changed files in CI
3. **Cache results**  -  Stryker incremental mode, PIT withHistory
4. **Parallel execution**  -  set concurrency/threads to CPU count
5. **Timeout tuning**  -  lower timeout kills hung mutants faster
6. **Exclude generated code**  -  skip DTOs, config, migrations
