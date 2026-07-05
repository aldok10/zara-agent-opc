package com.project.web

import com.kms.katalon.core.annotation.Keyword
import com.kms.katalon.core.testobject.TestObject
import com.kms.katalon.core.testobject.ConditionType
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import com.kms.katalon.core.webservice.keyword.WSBuiltInKeywords as WS
import com.kms.katalon.core.util.KeywordUtil
import com.kms.katalon.core.model.FailureHandling
import com.kms.katalon.core.exception.StepFailedException
import groovy.json.JsonSlurper

class WebActions {

    // --- Dynamic TestObject Factory ---

    @Keyword(keywordObject = "Browser")
    static TestObject byXpath(String xpath) {
        TestObject obj = new TestObject("dynamic_xpath")
        obj.addProperty("xpath", ConditionType.EQUALS, xpath)
        return obj
    }

    @Keyword(keywordObject = "Browser")
    static TestObject byCss(String css) {
        TestObject obj = new TestObject("dynamic_css")
        obj.addProperty("css", ConditionType.EQUALS, css)
        return obj
    }

    @Keyword(keywordObject = "Browser")
    static TestObject byText(String tag, String text) {
        TestObject obj = new TestObject("${tag}_${text}")
        obj.addProperty("xpath", ConditionType.EQUALS, "//${tag}[normalize-space()='${text}']")
        return obj
    }

    // --- Safe Click with Retry ---

    @Keyword(keywordObject = "Browser")
    def safeClick(TestObject to, int maxRetries = 3, int timeout = 15) {
        for (int attempt = 0; attempt < maxRetries; attempt++) {
            try {
                WebUI.waitForElementClickable(to, timeout)
                WebUI.click(to)
                KeywordUtil.markPassed("Clicked on attempt ${attempt + 1}")
                return
            } catch (StepFailedException e) {
                if (attempt == maxRetries - 1) {
                    KeywordUtil.markFailed("Failed after ${maxRetries} attempts: ${e.message}")
                }
                KeywordUtil.logInfo("Attempt ${attempt + 1} failed, retrying...")
                Thread.sleep(1000)
            }
        }
    }

    // --- Wait and Interact ---

    @Keyword(keywordObject = "Browser")
    def waitAndType(TestObject to, String text, int timeout = 15) {
        WebUI.waitForElementVisible(to, timeout)
        WebUI.clearText(to)
        WebUI.setText(to, text)
    }

    // --- Soft Assertion Collector ---

    @Keyword
    def softAssertAll(List<Closure> assertions) {
        List<String> failures = []
        assertions.each { assertion ->
            try {
                assertion.call()
            } catch (Exception e) {
                failures.add(e.message)
            }
        }
        if (failures.size() > 0) {
            KeywordUtil.markFailed("${failures.size()} assertion(s) failed:\n${failures.join('\n')}")
        } else {
            KeywordUtil.markPassed("All ${assertions.size()} assertions passed")
        }
    }

    // --- API JSON Helper ---

    @Keyword
    def apiGetJsonValue(String requestObjectPath, String jsonPath, Map params = [:]) {
        def response = WS.sendRequest(findTestObject(requestObjectPath, params))
        WS.verifyResponseStatusCode(response, 200)
        def json = new JsonSlurper().parseText(response.getResponseBodyContent())
        def value = jsonPath.split('\\.').inject(json) { obj, key ->
            if (key.contains('[')) {
                def parts = key.split(/[\[\]]/)
                obj[parts[0]][parts[1] as int]
            } else {
                obj[key]
            }
        }
        KeywordUtil.logInfo("${jsonPath} = ${value}")
        return value
    }
}
