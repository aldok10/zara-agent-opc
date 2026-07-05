# Web Testing

## Keyword Categories

| Category | Key Methods |
|----------|------------|
| Click | `click`, `doubleClick`, `rightClick`, `enhancedClick` (Shadow DOM), `jsClick` |
| Text | `setText`, `clearText`, `setEncryptedText`, `sendKeys` |
| Wait | `waitForElementPresent/Visible/Clickable/NotPresent/NotVisible`, `waitForPageLoad`, `waitForAngularLoad`, `waitForJQueryLoad` |
| Verify | `verifyElementPresent/Visible/Clickable/Text/AttributeValue/Checked`, `verifyTextPresent` |
| Get | `getText`, `getAttribute`, `getCSSValue`, `getUrl`, `getWindowTitle` |
| Switch | `switchToFrame`, `switchToDefaultContent`, `switchToWindowIndex/Title/Url` |
| Scroll | `scrollToElement`, `scrollToPosition` |
| Browser | `openBrowser`, `closeBrowser`, `navigateToUrl`, `back`, `forward`, `refresh` |
| Select | `selectOptionByIndex/Label/Value`, `check`, `uncheck` |
| Misc | `executeJavaScript`, `mouseOver`, `dragAndDropToObject`, `uploadFile`, `authenticate` |

## Locator Strategies (Priority Order)

1. **Attributes** - combine id, name, class with AND logic
2. **CSS** - fast, works in Shadow DOM
3. **XPath** - flexible but fragile if absolute; use relative
4. **Image** - screenshot-based, for highly dynamic UIs
5. **Smart Locator** - AI-powered, handles Shadow DOM, nested iframes, dynamic IDs

## Self-Healing (Two Tiers)

**Tier 1 (Classic):** When primary locator fails, tries alternatives in priority order (XPath > Attributes > CSS > Image > Smart Locator). Configurable in Project Settings.

**Tier 2 (AI):** If ALL classic locators fail, AI analyzes page source + accessibility tree + screenshots to find the target element. Suggests replacement locator.

After execution, review Self-Healing Insights tab. Approve or discard suggestions.

Excluded from self-healing by default: all `verify*` and `waitFor*` keywords (prevents false positives).

## Waits

**Smart Wait** (implicit): auto-waits for element interactability. Timeout in Project Settings > Execution (default 30s).

**Explicit waits** (recommended for control):
```groovy
WebUI.waitForElementClickable(findTestObject('Page/btn_Submit'), 15)
WebUI.click(findTestObject('Page/btn_Submit'))
```

Never use `Thread.sleep()`. Use `WebUI.waitForAngularLoad(10)` for Angular apps, `WebUI.waitForJQueryLoad(10)` for jQuery.

## iFrames

```groovy
WebUI.switchToFrame(findTestObject('Page/iframe_content'), 30)
WebUI.click(findTestObject('Page/btn_inside_frame'))
WebUI.switchToDefaultContent()
```

Alternative: set Parent Object on the test object in Object Repository.

## Shadow DOM

- XPath does NOT work inside Shadow DOM
- Use **Smart Locator** or **CSS** selection method
- Only open Shadow DOMs supported (closed = not accessible)
- Use `WebUI.enhancedClick()` for dynamic Shadow DOM elements

## Multiple Windows

```groovy
WebUI.switchToWindowTitle('New Window')
WebUI.switchToWindowIndex(1)
WebUI.closeWindowTitle('Popup')
```

## File Upload and Alerts

```groovy
WebUI.uploadFile(findTestObject('Page/input_file'), '/path/to/file.pdf')
WebUI.acceptAlert()
WebUI.dismissAlert()
String msg = WebUI.getAlertText()
```

## Screenshots

```groovy
WebUI.takeScreenshot('/tmp/current.png')
WebUI.takeFullPageScreenshot('/tmp/full.png')
WebUI.takeElementScreenshot(findTestObject('Page/chart'), '/tmp/chart.png')
```

## Anti-Patterns

- Thread.sleep() - use waitFor* keywords instead
- Absolute XPath (`/html/body/div[1]/...`) - use relative or CSS
- Monolithic 100+ step test cases - split with callTestCase
- Hardcoded credentials in scripts - use Protected Global Variables
- Ignoring self-healing reports - review and fix root cause locators
