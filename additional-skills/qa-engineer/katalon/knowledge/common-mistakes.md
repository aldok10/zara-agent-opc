---
title: Katalon Common Mistakes and Gotchas
type: pitfall
---

# Common Mistakes and Gotchas

## Fatal Mistakes

### 1. Thread.sleep() Everywhere
```groovy
// WRONG - wastes time, causes flaky tests
Thread.sleep(5000)
WebUI.click(findTestObject('Page/btn'))

// RIGHT - waits only as long as needed
WebUI.waitForElementClickable(findTestObject('Page/btn'), 15)
WebUI.click(findTestObject('Page/btn'))
```
Impact: slow suites, random timeouts in CI, false negatives.

### 2. Absolute XPath Locators
```groovy
// WRONG - breaks on ANY DOM change
/html/body/div[1]/div[3]/form/div[2]/input

// RIGHT - resilient locators
//input[@id='username']
//button[contains(text(),'Submit')]
[css] #login-form > input[name='email']
```
Impact: constant maintenance, self-healing can't help if all locators are fragile.

### 3. Hardcoded Credentials in Scripts
```groovy
// WRONG
WebUI.setText(findTestObject('Login/input_pass'), 'P@ssw0rd123')

// RIGHT - Protected Global Variable
WebUI.setText(findTestObject('Login/input_pass'), GlobalVariable.PASSWORD)
// Mark PASSWORD as Protected in Execution Profile
```
Impact: secrets leaked in reports/logs/git history.

### 4. String Concatenation in findTestObject
```groovy
// WRONG - bypasses Object Repository benefits, breaks self-healing
WebUI.click(findTestObject('Table/row_' + index))

// RIGHT - parameterized Test Object
// Object Repository xpath: //table/tr[${rowNum}]
WebUI.click(findTestObject('Table/row', ['rowNum': index]))
```

### 5. Ignoring FailureHandling
```groovy
// WRONG - optional popup check stops entire test
WebUI.click(findTestObject('Popup/btn_dismiss'))  // fails if no popup

// RIGHT
WebUI.click(findTestObject('Popup/btn_dismiss'), FailureHandling.OPTIONAL)
```

## Architecture Gotchas

### 6. Monolithic Test Cases (100+ steps)
Symptoms: hard to debug, long execution, unclear what failed.
Fix: split into reusable modules with `WebUI.callTestCase()`.

### 7. No Test Listeners (Setup/Teardown Duplication)
Symptoms: same login code in 50 test cases, one change = 50 edits.
Fix: `@BeforeTestCase` for login, `@AfterTestCase` for screenshot-on-failure.

### 8. Flat Object Repository
Symptoms: 500+ objects at root level, duplicate objects, naming chaos.
Fix: Page Object Model folders mirroring app pages/components.

### 9. Running TSC Sequentially When Parallel Works
Symptoms: 2-hour regression suite that could run in 20 minutes.
Fix: Test Suite Collections with Parallel mode, 20 TCs per suite max.

### 10. Not Using Execution Profiles
Symptoms: hardcoded URLs, manually editing GlobalVariable before runs.
Fix: separate profiles (dev/staging/prod), switch with `-executionProfile` flag.

## CI/CD Gotchas

### 11. Missing --shm-size in Docker
```bash
# WRONG - Chrome crashes with "tab crashed" errors
docker run katalonstudio/katalon katalonc.sh ...

# RIGHT
docker run --shm-size="2g" katalonstudio/katalon katalonc.sh ...
```

### 12. Using :latest Docker Tag
Symptoms: tests break randomly when image updates.
Fix: pin version `katalonstudio/katalon:11-latest-slim` or specific build.

### 13. Not Publishing Reports on Failure
```yaml
# WRONG - reports lost when tests fail
- run: katalonc.sh ...
- upload-artifact  # skipped on failure

# RIGHT
- upload-artifact
  if: always()  # runs even when tests fail
```

### 14. Skipping TestOps Integration
Symptoms: no trend data, can't identify flaky tests, blind to regressions.
Fix: always pass `-apiKey` and `-orgID` in CI.

## Scripting Gotchas

### 15. StaleElementReferenceException
Cause: DOM refreshed between finding and interacting with element.
Fix: re-find element, or wrap in retry loop.
```groovy
for (int i = 0; i < 3; i++) {
    try { WebUI.click(findTestObject('Page/dynamic_btn')); break }
    catch (Exception e) { if (i == 2) throw e; Thread.sleep(500) }
}
```

### 16. Element Click Intercepted
Cause: overlay, loading spinner, or another element covering target.
Fix: wait for overlay to disappear, or use JavaScript click.
```groovy
WebUI.waitForElementNotVisible(findTestObject('Page/spinner'), 15)
WebUI.click(findTestObject('Page/btn'))
// Or: WebUI.executeJavaScript("arguments[0].click()", [WebUI.findWebElement(to)])
```

### 17. XPath Doesn't Work in Shadow DOM
Cause: XPath cannot pierce shadow boundaries.
Fix: use CSS selection method or Smart Locator.

### 18. switchToFrame Without switchToDefaultContent
Cause: forgot to switch back after interacting inside iframe.
Fix: always pair `switchToFrame` with `switchToDefaultContent`.

### 19. Global Variable Modified in One Suite Affects Others
Reality: Global Variables are scoped per Test Suite in a TSC.
Modifying in Suite A does NOT affect Suite B (they get independent copies).
Gotcha: people think modification persists globally. It doesn't in parallel TSC.

### 20. Encrypted Text Breaks After KS Version Upgrade
Cause: encryption key changes between Katalon versions.
Fix: re-encrypt passwords after upgrading. Use `setEncryptedText` with freshly encrypted value.

## Performance Gotchas

### 21. Leaving Log Executed Test Steps Enabled
Impact: 30-40% slower execution due to verbose I/O.
Fix: disable in Project Settings > Execution for CI runs.

### 22. Default Timeout Too High (30s)
Impact: failed tests take forever because every missing element waits 30s.
Fix: lower default to 10-15s, use explicit higher timeouts only where needed.

### 23. Screenshots on Every Step
Impact: massive report size, slow I/O.
Fix: screenshots only on failure (configure in Test Listener @AfterTestCase).

## Git/Collaboration Gotchas

### 24. Committing Reports/ Folder
Impact: bloated repo, merge conflicts on generated files.
Fix: add `Reports/` to .gitignore.

### 25. .prj File Merge Conflicts
Cause: multiple devs changing project settings simultaneously.
Fix: designate one person for settings changes, or use `*.prj merge=ours` in .gitattributes.

### 26. Absolute Paths in .classpath or Test Objects
Impact: works on one machine, fails on all others.
Fix: use relative paths, review before committing.
