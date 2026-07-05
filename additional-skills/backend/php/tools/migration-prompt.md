---
type: tool
title: "PHP Version Migration"
---

# PHP Version Migration

## Purpose

Plan PHP version migrations with deprecation handling, new feature adoption, and compatibility verification. Covers breaking changes, performance improvements, and incremental upgrade paths.

## When to Use

- Upgrading PHP version (8.1->8.2, 8.2->8.3, 8.3->8.4)
- Identifying deprecated features that will break on upgrade
- Adopting new language features (readonly, enums, fibers, property hooks)
- Updating Composer dependencies for PHP version compatibility
- Verifying framework compatibility with target PHP version

## Prompt Template

```
CONTEXT:
- Current PHP version: [8.1 | 8.2 | 8.3]
- Target PHP version: [8.2 | 8.3 | 8.4]
- Framework: [Laravel | Symfony | WordPress | Drupal | custom]
- Composer dependencies: [count, key packages]
- Deployment: [shared hosting | container | serverless | PaaS]
- Test coverage: [percentage or description]
- Extensions in use: [list critical extensions]

MIGRATION CHECKLIST:
1. Deprecation audit
   - Deprecated functions/features in current version
   - Removed features in target version
   - Dynamic properties deprecation (8.2)
   - Implicit nullable types (8.4)
   - Run: php -d error_reporting=E_ALL with deprecation tracking

2. Breaking changes (version-specific)
   - Type system changes (intersection types, DNF types, type variance)
   - Internal class changes (return types added)
   - Default value changes (functions with changed behavior)
   - Extension API changes

3. New feature adoption
   - 8.2: readonly classes, DNF types, constants in traits
   - 8.3: typed class constants, json_validate, Randomizer additions
   - 8.4: property hooks, asymmetric visibility, lazy objects, new array functions

4. Dependency compatibility
   - composer why-not php [target]
   - Framework minimum PHP requirement
   - Extension availability for target version
   - PECL extensions needing recompilation

5. Performance considerations
   - JIT improvements per version
   - OPcache configuration changes
   - Memory usage differences
   - Preloading adjustments

6. Tooling updates
   - PHPStan/Psalm level adjustment
   - PHP-CS-Fixer rules for new syntax
   - IDE/editor PHP version setting
   - CI matrix configuration

TESTING:
- Run test suite on target version
- Static analysis at max level
- Deprecation log review
- Load test for performance regression
```

## Output Format

```
## PHP Migration: [current] -> [target]

### Breaking Changes
| Change | Category | Files Affected | Fix |
|--------|----------|---------------|-----|
| ... | ... | ... | ... |

### Deprecations to Address
| Feature | Replacement | Effort |
|---------|-------------|--------|
| ... | ... | ... |

### Feature Adoption Plan
| Feature | Use Case | Priority |
|---------|----------|----------|
| ... | ... | P1/P2/P3 |

### Dependency Status
| Package | Current | Required | Status |
|---------|---------|----------|--------|
| ... | ... | ... | compatible/needs-update/blocking |

### Migration Steps
1. [Step with validation gate]

### Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| ... | ... | ... | ... |
```
