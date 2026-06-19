# Automation Examples

## Repository Maintenance

### Scenario
Keeping a repository clean and well-maintained.

### Ask Zara
```
Audit our repository for maintenance issues:
- Outdated dependencies
- Dead code
- Missing documentation
- Stale branches
- Security vulnerabilities
```

### Expected Workflow
1. Zara coordinates multiple sub-agents
2. Analysis:
   - Dependency audit (outdated packages)
   - Code coverage gaps
   - Documentation gaps
   - Branch cleanup strategy
   - Security vulnerability scan
3. Action plan prioritized by impact

---

## Release Automation

### Scenario
Automating the release process.

### Ask Zara
```
Design a release automation workflow for our project.
We follow semantic versioning and maintain a changelog.
```

### Expected Workflow
1. Zara engages `delivery-lead`
2. Design:
   - Version bump strategy (semver)
   - Changelog generation (conventional commits)
   - Automated tagging and releases
   - Release notes generation
   - Package publishing
3. GitHub Actions workflow:
   - On push to main: dry-run release
   - On tag push: publish release
   - Automated changelog
   - Release assets

---

## Dependency Management

### Scenario
Managing dependencies across a monorepo.

### Ask Zara
```
Create a dependency management strategy for our monorepo
with shared packages. We need version consistency and
automated updates.
```

### Expected Workflow
1. Zara engages `practices-lead`
2. Strategy:
   - Dependency versioning convention
   - Automated dependency updates (Renovate/Dependabot)
   - Breaking change detection
   - Shared dependency hoisting
   - Lockfile management
3. Tool recommendations:
   - Renovate for automated PRs
   - pnpm workspaces for monorepo
   - Changesets for versioning

---

## Code Quality Automation

### Scenario
Setting up automated code quality checks.

### Ask Zara
```
Set up automated code quality checks for our project.
Include linting, formatting, type checking, and security scanning.
```

### Expected Workflow
1. Zara engages `practices-lead`
2. Recommendations:
   - ESLint with strict config
   - Prettier for formatting
   - TypeScript strict mode
   - Husky for pre-commit hooks
   - lint-staged for staged files
   - CodeQL for security scanning
3. CI integration:
   - PR checks
   - Pre-commit hooks
   - Automated fixes
