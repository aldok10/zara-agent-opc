# Katalon WebUI Testing

Patterns for reliable browser automation with the `WebUI` keyword library.

## Keyword Categories

- **Interaction**: `click`, `setText`, `clearText`, `selectOptionByLabel`, `check`, `uncheck`
- **Waits**: `waitForElementPresent`, `waitForElementVisible`, `waitForElementClickable`, `waitForPageLoad`
- **Verification**: `verifyElementPresent`, `verifyElementText`, `verifyElementVisible`, `verifyMatch`
- **Getters**: `getText`, `getAttribute`, `getUrl`, `getWindowIndex`
- **Context switch**: `switchToFrame`, `switchToWindowTitle`, `switchToDefaultContent`
- **Scroll**: `scrollToElement`, `scrollToPosition`

## Locator Strategies

- **XPath** - flexible but brittle when DOM shifts
- **CSS** - faster, works inside Shadow DOM open roots
- **Attributes** - Katalon matches by property set (id, name, class)
- **Image** - visual match, use sparingly (slow, fragile)
- **Smart Locator** - AI-generated, best for Shadow DOM and dynamic UIs

Prefer stable attributes (`id`, `data-testid`) over positional XPath.

## Self-Healing

Two tiers, applied when the primary locator fails:

1. **Classic alternative locators** - falls back to backup locator methods you enabled per object.
2. **AI-powered Smart Locator** - regenerates a locator when others fail, logs the healed selector so you can update the object.

## Smart Wait vs Explicit Waits

Smart Wait auto-waits for pending AJAX/JS before actions (enable in Project Settings). Still add explicit waits before interaction:

```groovy
WebUI.waitForElementClickable(findTestObject('LoginPage/btn_Submit'), 10)
WebUI.click(findTestObject('LoginPage/btn_Submit'))
```

## Iframes

Switch into the frame, act, then switch back:

```groovy
WebUI.switchToFrame(findTestObject('Page/iframe_Editor'), 5)
WebUI.setText(findTestObject('Page/txt_Body'), 'content')
WebUI.switchToDefaultContent()
```

Configure the object's parent iframe in its properties for nested frames.

## Shadow DOM

XPath does not cross shadow boundaries. Use Smart Locator or CSS with the object's Shadow Root parent configured. Set the shadow host in the Test Object's "Shadow Root" field.

## Multiple Windows

```groovy
WebUI.switchToWindowTitle('Payment Gateway')
WebUI.switchToWindowIndex(1)
WebUI.switchToWindowUrl('https://checkout.app.com')
```

## File Uploads

```groovy
WebUI.uploadFile(findTestObject('Page/input_File'), '/path/to/file.pdf')
WebUI.uploadFileByDragAndDrop(findTestObject('Page/drop_Zone'), '/path/to/file.pdf')
```

## Alerts

```groovy
WebUI.waitForAlert(5)
String msg = WebUI.getAlertText()
WebUI.acceptAlert()   // or WebUI.dismissAlert()
```

## Screenshots

```groovy
WebUI.takeScreenshot('screenshots/checkout.png')
WebUI.takeFullPageScreenshot('screenshots/full.png')
WebUI.takeElementScreenshot('screenshots/btn.png', findTestObject('Page/btn_Buy'))
```

## Anti-Patterns to Avoid

- `Thread.sleep()` - use `waitFor*` keywords instead
- Hardcoded absolute XPath (`/html/body/div[3]/...`) - use stable attributes
- Monolithic test cases - split into modular cases with `callTestCase`
