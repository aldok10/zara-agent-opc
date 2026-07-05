# Custom Keywords

## Creating a Custom Keyword

```groovy
package com.project.web

import com.kms.katalon.core.annotation.Keyword
import com.kms.katalon.core.testobject.TestObject
import com.kms.katalon.core.testobject.ConditionType
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import com.kms.katalon.core.util.KeywordUtil
import com.kms.katalon.core.model.FailureHandling

class WebActions {

    @Keyword(keywordObject = "Browser")
    def safeClick(TestObject to, int timeout = 30) {
        WebUI.waitForElementClickable(to, timeout)
        WebUI.click(to)
    }
}
```

Place in `Keywords/com/project/web/WebActions.groovy`. Use in test cases:
```groovy
CustomKeywords.'com.project.web.WebActions.safeClick'(findTestObject('Page/btn'), 15)
```

## FailureHandling Enum

| Mode | Behavior |
|------|----------|
| `STOP_ON_FAILURE` | Default. Test stops immediately on failure. |
| `CONTINUE_ON_FAILURE` | Logs failure, continues execution. Test still marked FAILED. |
| `OPTIONAL` | Logs as warning. Test can still PASS. |

```groovy
// Dismiss optional popup
WebUI.click(findTestObject('Popup/btn_dismiss'), FailureHandling.OPTIONAL)

// Verify multiple items without stopping
WebUI.verifyElementPresent(findTestObject('Page/item1'), 5, FailureHandling.CONTINUE_ON_FAILURE)
WebUI.verifyElementPresent(findTestObject('Page/item2'), 5, FailureHandling.CONTINUE_ON_FAILURE)
```

## KeywordUtil Logging

```groovy
KeywordUtil.logInfo("Current URL: ${WebUI.getUrl()}")
KeywordUtil.markPassed("Login successful")
KeywordUtil.markWarning("Element took longer than expected")
KeywordUtil.markFailed("Expected element not found")  // throws, stops test
```

## Dynamic TestObject (Runtime Creation)

```groovy
TestObject obj = new TestObject("dynamic_btn")
obj.addProperty("xpath", ConditionType.EQUALS, "//button[text()='${buttonText}']")
WebUI.click(obj)
```

## Parameterized Test Objects

Define xpath in Object Repository: `//table/tr[${rowNum}]/td[${colNum}]`

```groovy
TestObject cell = findTestObject('Table/cell', ['rowNum': 3, 'colNum': 2])
String text = WebUI.getText(cell)
```

## callTestCase for Modularity

```groovy
// Returns a value from the called test case
def token = WebUI.callTestCase(findTestCase('API/GetAuthToken'), [
    'clientId': GlobalVariable.CLIENT_ID
])
```

## External Libraries

Option 1: Drop JARs in `Drivers/` folder (auto-loaded on project open).

Option 2: Use `build.gradle`:
```groovy
dependencies {
    implementation 'com.google.code.gson:gson:2.10.1'
}
```

## Error Handling

```groovy
import com.kms.katalon.core.exception.StepFailedException

try {
    WebUI.click(findTestObject('Page/dynamic_element'))
} catch (StepFailedException e) {
    KeywordUtil.logInfo("Element not found: ${e.message}")
    WebUI.takeScreenshot()
    throw e
}
```

## Retry Pattern

```groovy
@Keyword
def retryClick(TestObject to, int maxRetries = 3) {
    for (int i = 0; i < maxRetries; i++) {
        try {
            WebUI.click(to)
            return
        } catch (Exception e) {
            if (i == maxRetries - 1) throw e
            Thread.sleep(1000)
        }
    }
}
```

## Groovy Features Available

- GStrings: `"Hello ${name}"`
- Safe navigation: `response?.data?.user`
- Elvis: `value ?: 'default'`
- Closures: `items.each { println it }`
- JSON: `new JsonSlurper().parseText(text)`
- Collections: `.findAll`, `.collect`, `.groupBy`

## Soft Assertion Pattern

```groovy
List<String> failures = []
try { WebUI.verifyElementText(obj1, 'expected') } catch (e) { failures.add(e.message) }
try { WebUI.verifyElementVisible(obj2) } catch (e) { failures.add(e.message) }
if (failures) KeywordUtil.markFailed("${failures.size()} assertions failed:\n${failures.join('\n')}")
```
