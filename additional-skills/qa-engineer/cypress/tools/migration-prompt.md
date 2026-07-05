---
type: tool
title: "Cypress to Playwright Migration Prompt"
---

# Cypress to Playwright Migration Prompt

## Purpose
Guide systematic migration of Cypress test suites to Playwright, mapping selectors, patterns, and APIs between frameworks.

## When to Use
- Migrating an existing Cypress test suite to Playwright
- Evaluating migration effort and planning sprints
- Converting specific test files from Cypress syntax to Playwright
- Setting up Playwright infrastructure to replace Cypress

## Prompt Template

```
You are a test automation architect migrating a Cypress suite to Playwright.

CONTEXT:
- Cypress version: {version}
- Target Playwright version: {version}
- Language: {typescript|javascript}
- Test count: {number_of_spec_files}
- Custom commands: {list_key_custom_commands}
- Plugins used: {cypress-testing-library|cypress-axe|cypress-intercept|etc}

CYPRESS CODE TO MIGRATE:
{paste_cypress_test_or_command}

MIGRATION MAPPING:

1. SELECTORS
   - cy.get('[data-testid="x"]') → page.getByTestId('x')
   - cy.contains('text') → page.getByText('text')
   - cy.get('role') → page.getByRole('role', { name: 'x' })
   - .find() → .locator() chaining
   - .eq(n) → .nth(n)

2. ACTIONS
   - .click() → .click()
   - .type('text') → .fill('text')
   - .clear().type() → .fill('')  then .fill('text')
   - .select('val') → .selectOption('val')
   - .check() → .check()
   - .trigger('event') → .dispatchEvent('event')

3. ASSERTIONS
   - .should('be.visible') → expect(loc).toBeVisible()
   - .should('have.text', 'x') → expect(loc).toHaveText('x')
   - .should('have.length', n) → expect(loc).toHaveCount(n)
   - .should('not.exist') → expect(loc).not.toBeAttached()

4. PATTERNS
   - cy.intercept() → page.route()
   - cy.wait('@alias') → page.waitForResponse()
   - cy.fixture() → JSON.parse(fs.readFileSync())
   - beforeEach(cy.visit) → page.goto() in beforeEach or fixture
   - Custom commands → Page Object methods or fixtures

5. CONFIGURATION
   - cypress.config.ts → playwright.config.ts
   - baseUrl → use: { baseURL }
   - env vars → use: { ...env } or .env file
   - viewport → use: { viewport: { width, height } }

RULES:
- Prefer Playwright's auto-waiting over explicit waits
- Use web-first assertions (expect(loc).toBeVisible vs manual polling)
- Replace cy.wait(ms) with proper waitFor conditions
- Convert custom commands to fixtures or POM methods
- Flag patterns with no direct equivalent (cy.session specifics)
- Note parallel execution differences
```

## Output Format

```markdown
## Migration Result

### Converted Test
[Playwright test code]

### Pattern Mapping Used
| Cypress Pattern | Playwright Equivalent | Notes |

### Manual Attention Needed
- [Patterns that need human decision]

### Migration Checklist
- [ ] Selectors updated to Playwright locators
- [ ] Assertions use web-first expect()
- [ ] Network mocking converted to page.route()
- [ ] Custom commands replaced with fixtures/POM
- [ ] Config migrated
```
