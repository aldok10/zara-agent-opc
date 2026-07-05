---
title: Katalon Built-in Keywords Quick Reference
type: fact
---

# Keywords Reference

## WebUI Keywords (90+)

### Click / Interaction
- `click(to)` - standard click (retries if overlay detected)
- `doubleClick(to)` - double-click
- `rightClick(to)` - context menu click
- `enhancedClick(to)` - works with Shadow DOM, dynamic elements
- `jsClick(to)` - JavaScript click (bypasses overlay issues)
- `clickOffset(to, x, y)` - click at offset from element center
- `mouseOver(to)` - hover over element
- `dragAndDropToObject(from, to)` - drag and drop
- `focus(to)` - focus on element

### Text Input
- `setText(to, text)` - set input value
- `clearText(to)` - clear input
- `setEncryptedText(to, text)` - set password (encrypted)
- `sendKeys(to, keys)` - send key sequence

### Wait (Explicit)
- `waitForElementPresent(to, timeout)` - exists in DOM
- `waitForElementVisible(to, timeout)` - visible on screen
- `waitForElementClickable(to, timeout)` - interactable
- `waitForElementNotPresent(to, timeout)` - removed from DOM
- `waitForElementNotVisible(to, timeout)` - hidden
- `waitForElementAttributeValue(to, attr, val, timeout)` - attribute matches
- `waitForPageLoad(timeout)` - page fully loaded
- `waitForAngularLoad(timeout)` - Angular async complete
- `waitForJQueryLoad(timeout)` - jQuery AJAX complete
- `waitForAlert(timeout)` - alert dialog appears

### Verify / Assert
- `verifyElementPresent(to, timeout)` - element exists
- `verifyElementVisible(to)` - element visible
- `verifyElementClickable(to)` - element interactable
- `verifyElementText(to, text)` - text matches
- `verifyElementAttributeValue(to, attr, val)` - attribute matches
- `verifyElementChecked(to)` / `verifyElementNotChecked(to)`
- `verifyTextPresent(text, isRegex)` - text on page
- `verifyAlertPresent(timeout)` - alert exists
- `verifyAllLinksOnCurrentPageAccessible(...)` - all links return 2xx

### Get / Retrieve
- `getText(to)` - visible text content
- `getAttribute(to, attr)` - attribute value
- `getCSSValue(to, prop)` - CSS property
- `getUrl()` - current page URL
- `getWindowTitle()` - current window title
- `getAlertText()` - alert dialog text
- `getNumberOfTotalOption(to)` - dropdown options count
- `getAllLinksOnCurrentPage()` - all link URLs

### Switch (Frame/Window)
- `switchToFrame(to, timeout)` - enter iframe
- `switchToDefaultContent()` - back to main document
- `switchToWindowIndex(index)` - by zero-based index
- `switchToWindowTitle(title)` - by title match
- `switchToWindowUrl(url)` - by URL match

### Browser / Navigation
- `openBrowser(url)` - launch browser
- `closeBrowser()` - close browser
- `navigateToUrl(url)` - go to URL
- `back()` / `forward()` / `refresh()`
- `maximizeWindow()` - maximize
- `setViewPortSize(w, h)` - resize viewport
- `deleteAllCookies()` - clear cookies

### Form / Select
- `selectOptionByIndex/Label/Value(to, ...)` - dropdown select
- `check(to)` / `uncheck(to)` - checkbox
- `submit(to)` - form submit
- `uploadFile(to, path)` - file input
- `uploadFileByDragAndDrop(to, path)` - drag-drop upload

### Screenshot
- `takeScreenshot(path)` - viewport
- `takeFullPageScreenshot(path)` - stitched full page
- `takeElementScreenshot(to, path)` - specific element

### Misc
- `executeJavaScript(script, args)` - run JS
- `authenticate(url, user, pass, timeout)` - HTTP basic auth
- `modifyObjectProperty(to, name, method, value, active)` - change locator at runtime

## Mobile Keywords

### Application
- `startApplication(appPath, uninstallAfter)` - launch app
- `closeApplication()` - close app

### Interaction
- `tap(to, timeout)` - tap element
- `setText(to, text, timeout)` - input text
- `clearText(to, timeout)` - clear field
- `swipe(startX, startY, endX, endY)` - swipe gesture
- `scrollToText(text)` - scroll until text found
- `pressBack()` - Android back button
- `hideKeyboard()` - dismiss keyboard

### Verification
- `verifyElementExist(to, timeout)` - element exists
- `verifyElementVisible(to, timeout)` - element visible
- `verifyElementAttributeValue(to, attr, val, timeout)` - attribute check
- `waitForElementPresent(to, timeout)` - wait for element

## WS (Web Service) Keywords

- `sendRequest(requestObject)` - send HTTP request, returns ResponseObject
- `sendRequestAndVerify(requestObject)` - send + auto-verify
- `verifyResponseStatusCode(response, code)` - exact status code
- `verifyResponseStatusCodeInRange(response, from, to)` - range check
- `verifyElementPropertyValue(response, path, value)` - JSON/XML path value
- `verifyElementsCount(response, path, count)` - array length
- `containsString(response, text, isRegex)` - body contains text
- `validateJsonAgainstSchema(response, schemaPath)` - JSON Schema validation
- `getElementPropertyValue(response, path)` - extract value from response

## Windows Keywords

- `startApplicationWithTitle(appPath, title)` - launch Windows app
- `click(to)` / `setText(to, text)` / `getText(to)`
- `verifyElementAttributeValue(to, attr, val, timeout)`
- `switchToDesktop()` / `switchToWindow()`
- `closeApplication()`

## Common Keywords

- `callTestCase(testCase, variables, failureHandling)` - call another TC
- `verifyCheckpoint(checkpoint, logFailed)` - data comparison
- `delay(seconds)` - static wait (AVOID - use waitFor* instead)
