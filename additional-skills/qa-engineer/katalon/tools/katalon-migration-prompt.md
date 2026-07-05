# Katalon Migration Prompt

Use this template when converting tests from Selenium, Playwright, or Cypress to Katalon.

## Input

Provide the source test file (Selenium Java, Playwright TypeScript, Cypress JS, etc.)

## Output Format

1. Katalon Test Case script (Groovy)
2. Object Repository structure (list of Test Objects with locators)
3. Required Execution Profile variables (if any)

## Conversion Rules

### Selenium/WebDriver to Katalon

| Selenium | Katalon |
|----------|---------|
| `driver.get(url)` | `WebUI.navigateToUrl(url)` |
| `driver.findElement(By.id("x"))` | `findTestObject('Page/element_x')` |
| `element.click()` | `WebUI.click(findTestObject('Page/element'))` |
| `element.sendKeys("text")` | `WebUI.setText(findTestObject('Page/element'), "text")` |
| `element.getText()` | `WebUI.getText(findTestObject('Page/element'))` |
| `WebDriverWait.until(...)` | `WebUI.waitForElementVisible(to, timeout)` |
| `assertEquals(expected, actual)` | `WebUI.verifyElementText(to, expected)` |
| `driver.switchTo().frame(...)` | `WebUI.switchToFrame(to, timeout)` |
| `driver.quit()` | `WebUI.closeBrowser()` |

### Playwright to Katalon

| Playwright | Katalon |
|-----------|---------|
| `page.goto(url)` | `WebUI.navigateToUrl(url)` |
| `page.locator('#id').click()` | `WebUI.click(findTestObject('Page/element'))` |
| `page.locator('#id').fill(text)` | `WebUI.setText(findTestObject('Page/element'), text)` |
| `await expect(loc).toBeVisible()` | `WebUI.verifyElementVisible(findTestObject('Page/element'))` |
| `page.waitForSelector(...)` | `WebUI.waitForElementPresent(to, timeout)` |

### Assertions

| Source | Katalon |
|--------|---------|
| `assertEquals` / `expect().toBe()` | `WebUI.verifyElementText(to, expected)` |
| `assertTrue(element.isDisplayed())` | `WebUI.verifyElementVisible(to)` |
| `assertFalse(element.isDisplayed())` | `WebUI.verifyElementNotVisible(to)` |

### Object Repository Entry Format

For each element extracted from the source test:
```
Path: Object Repository/PageName/elementDescription
Locator Strategy: CSS (preferred) or XPath
Value: #login-button or //button[@type='submit']
```

## Instructions for the LLM

1. Read the source test file completely
2. Identify all page elements and their locators
3. Create Object Repository entries (one per unique element)
4. Convert test steps to Katalon WebUI keywords
5. Replace hardcoded waits with waitFor* keywords
6. Extract environment-specific values to Global Variables
7. Add WebUI.openBrowser() at start and WebUI.closeBrowser() at end
8. Use FailureHandling.CONTINUE_ON_FAILURE for non-critical assertions
